import { expect } from "bun:test"
import { Deferred, Effect, Fiber, Layer, Schema, Stream } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"
import { HoushiarMemory } from "@opencode/core/houshiar-memory"
import { Houshiar } from "@opencode/schema/houshiar"
import { Session } from "@opencode/core/session"
import { Location } from "@opencode/core/location"
import { Bus } from "@opencode/core/bus"
import { Database } from "@opencode/core/database/database"
import { SessionStore } from "@opencode/core/session/store"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { SessionEvent } from "@opencode/core/session/event"
import { PluginTestLayer } from "./plugin/fixture"
import { testEffect } from "./lib/effect"

const it = testEffect(PluginTestLayer)
const Wire = Schema.StructWithRest(
  Schema.Struct({
    messages: Schema.Array(Schema.Record(Schema.String, Schema.Json)),
    conversation_id: Schema.String,
    memory_enabled: Schema.Boolean,
  }),
  [Schema.Record(Schema.String, Schema.Json)],
)
const read = (request: HttpClientRequest.HttpClientRequest) =>
  HttpClientRequest.toWeb(request).pipe(
    Effect.flatMap((web) => Effect.promise(() => web.text())),
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(Wire))),
  )

const harness = Effect.gen(function* () {
  const sessions = yield* Session.Service
  const location = yield* Location.Service
  const bus = yield* Bus.Service
  const database = yield* Database.Service
  const store = yield* SessionStore.Service.pipe(
    Effect.provide(
      LayerNode.compile(SessionStore.node, {
        replacements: [Database.node.replace(Layer.succeed(Database.Service, database))],
      }),
    ),
  )
  const remotes = new Map<string, typeof Houshiar.ConversationHistory.Type>()
  const calls: Array<{ body: typeof Wire.Type; revision: string | undefined }> = []
  const apiCalls: string[] = []
  const http = HttpClient.make((request) =>
    Effect.gen(function* () {
      expect(request.headers.authorization).toBe("Bearer user-key")
      apiCalls.push(`${request.method} ${request.url}`)
      if (request.method === "POST") {
        const web = yield* HttpClientRequest.toWeb(request)
        const body = yield* Effect.promise(() => web.text()).pipe(
          Effect.flatMap(
            Schema.decodeUnknownEffect(
              Schema.fromJsonString(Schema.Struct({ protocol: Schema.Literals(["openai", "anthropic"]) })),
            ),
          ),
        )
        const remote = {
          id: `remote_${remotes.size + 1}`,
          protocol: body.protocol === "anthropic" ? ("anthropic" as const) : ("openai" as const),
          revision: 0,
          created_at: "2026-11-15T08:00:00Z",
          updated_at: "2026-11-15T08:00:00Z",
          messages: [],
          summary: "",
          system: null,
        }
        remotes.set(remote.id, remote)
        return HttpClientResponse.fromWeb(request, Response.json(remote, { status: 201 }))
      }
      const remote = remotes.get(request.url.split("/").at(-1) ?? "")
      return HttpClientResponse.fromWeb(request, Response.json(remote ?? {}, { status: remote ? 200 : 404 }))
    }).pipe(Effect.orDie),
  )
  const memory = yield* HoushiarMemory.Service.pipe(
    Effect.provide(
      HoushiarMemory.layer.pipe(
        Layer.provide(
          Layer.mergeAll(Layer.succeed(HttpClient.HttpClient, http), Layer.succeed(SessionStore.Service, store)),
        ),
      ),
    ),
  )
  const handler = (request: HttpClientRequest.HttpClientRequest) =>
    Effect.gen(function* () {
      const body = yield* read(request)
      expect(request.headers.authorization).toBe("Bearer user-key")
      expect(request.headers["x-api-key"]).toBeUndefined()
      calls.push({ body, revision: request.headers["x-memory-revision"] })
      expect(request.headers["x-conversation-id"]).toBe(body.conversation_id)
      const remote = remotes.get(body.conversation_id)!
      remotes.set(remote.id, {
        ...remote,
        revision: remote.revision + 1,
        messages: [...remote.messages, ...body.messages, { role: "assistant", content: "answer" }],
      })
      return HttpClientResponse.fromWeb(request, new Response("answer"))
    })
  const request = (messages: ReadonlyArray<Schema.Json>, protocol = "openai") =>
    HttpClientRequest.post(`${Houshiar.baseURL}/${protocol === "anthropic" ? "messages" : "chat/completions"}`).pipe(
      HttpClientRequest.setHeaders(
        protocol === "anthropic"
          ? { "x-api-key": "user-key", "x-conversation-id": "inherited-id" }
          : { authorization: "Bearer user-key", "x-conversation-id": "inherited-id" },
      ),
      HttpClientRequest.bodyJson({
        model: "test",
        messages,
        stream: true,
        conversation_id: "inherited-id",
        memory_enabled: false,
      }),
    )
  const create = () => sessions.create({ location: { directory: location.directory } })
  const admit = Effect.fn(function* (sessionID: Session.ID, text: string) {
    const admitted = yield* sessions.prompt({ sessionID, text, resume: false })
    yield* bus.publish(SessionEvent.InboxDelivered, { sessionID, inboxID: admitted.id })
  })
  return { sessions, memory, remotes, calls, apiCalls, handler, request, create, admit }
})

it.effect("adopts legacy root chat IDs while giving legacy children independent conversations", () =>
  Effect.gen(function* () {
    const h = yield* harness
    const parent = yield* h.create()
    yield* h.admit(parent.id, "hello")
    const first = yield* h.request([{ role: "user", content: "hello" }])
    yield* h.memory
      .middleware(parent.id)(first, h.handler)
      .pipe(Effect.flatMap((response) => response.text))
    yield* h.sessions.setMetadata({ sessionID: parent.id, metadata: { houshiarConversationID: "remote_1" } })
    const child = yield* h.sessions.create({ parentID: parent.id })
    yield* h.admit(parent.id, "new user message")
    yield* h.memory
      .middleware(parent.id)(yield* h.request([{ role: "user", content: "new user message" }]), h.handler)
      .pipe(Effect.flatMap((response) => response.text))
    yield* h.memory
      .middleware(child.id)(first, h.handler)
      .pipe(Effect.flatMap((response) => response.text))
    expect(h.calls.map((call) => call.body.conversation_id)).toEqual(["remote_1", "remote_1", "remote_2"])
    expect(h.calls[1]?.body.messages).toEqual([{ role: "user", content: "new user message" }])
  }),
)

it.effect("keeps Anthropic tool-result deltas and rejects a protocol switch without retrying", () =>
  Effect.gen(function* () {
    const h = yield* harness
    const session = yield* h.create()
    yield* h.admit(session.id, "inspect")
    yield* h.memory
      .middleware(session.id)(yield* h.request([{ role: "user", content: "inspect" }], "anthropic"), h.handler)
      .pipe(Effect.flatMap((response) => response.text))
    const remote = h.remotes.get("remote_1")!
    const serverMessages: typeof Houshiar.ConversationHistory.Type.messages = [
      { role: "user", content: "inspect" },
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "server reasoning", signature: "server-signature" },
          { type: "tool_use", id: "call_1", name: "read", input: {} },
        ],
      },
    ]
    h.remotes.set(remote.id, { ...remote, messages: serverMessages })
    const result = { role: "user", content: [{ type: "tool_result", tool_use_id: "call_1", content: "file contents" }] }
    yield* h.memory
      .middleware(session.id)(
        yield* h.request(
          [
            { role: "user", content: "inspect" },
            { role: "assistant", content: [{ type: "tool_use", id: "call_1", name: "read", input: {} }] },
            result,
          ],
          "anthropic",
        ),
        h.handler,
      )
      .pipe(Effect.flatMap((response) => response.text))
    expect(h.calls[1]?.body.messages).toEqual([...serverMessages, result])
    const wrongProtocol = yield* h.memory.middleware(session.id)(
      yield* h.request([{ role: "user", content: "inspect" }]),
      h.handler,
    )
    expect(wrongProtocol.status).toBe(400)
    yield* wrongProtocol.text
    expect(h.calls).toHaveLength(2)
    expect(h.remotes.size).toBe(1)
  }),
)

it.effect("does not resend an identical rejected request after reloading an unchanged empty history", () =>
  Effect.gen(function* () {
    const h = yield* harness
    const session = yield* h.create()
    yield* h.admit(session.id, "hello")
    const sent: string[] = []
    const response = yield* h.memory.middleware(session.id)(
      yield* h.request([{ role: "user", content: "hello" }]),
      (request) => {
        sent.push(request.url)
        return Effect.succeed(
          HttpClientResponse.fromWeb(
            request,
            Response.json({ detail: { code: "conversation_history_conflict" } }, { status: 409 }),
          ),
        )
      },
    )
    expect(response.status).toBe(409)
    expect(yield* response.json).toEqual({ detail: { code: "conversation_history_conflict" } })
    expect(sent).toHaveLength(1)
  }),
)

it.effect("releases the conversation lock when a response is cancelled", () =>
  Effect.gen(function* () {
    const h = yield* harness
    const session = yield* h.create()
    yield* h.admit(session.id, "hello")
    const request = yield* h.request([{ role: "user", content: "hello" }])
    const response = yield* h.memory.middleware(session.id)(request, (request) =>
      Effect.gen(function* () {
        const body = yield* Stream.toReadableStreamEffect(
          Stream.concat(Stream.make(new TextEncoder().encode("partial")), Stream.fromEffect(Effect.never)),
        )
        return HttpClientResponse.fromWeb(request, new Response(body))
      }),
    )
    yield* response.stream.pipe(Stream.take(1), Stream.runDrain)
    yield* h.memory
      .middleware(session.id)(request, h.handler)
      .pipe(Effect.flatMap((response) => response.text))
    expect(h.calls).toHaveLength(1)
  }),
)

it.effect("does not repeat an anchored subagent tool request when the backend history has not changed", () =>
  Effect.gen(function* () {
    const h = yield* harness
    const parent = yield* h.create()
    const child = yield* h.sessions.create({ parentID: parent.id })
    yield* h.admit(child.id, "Inspect the repository")
    yield* h.memory
      .middleware(child.id)(
        yield* h.request([{ role: "user", content: "Inspect the repository" }], "anthropic"),
        h.handler,
      )
      .pipe(Effect.flatMap((response) => response.text))
    const remote = h.remotes.get("remote_1")!
    const history: typeof Houshiar.ConversationHistory.Type.messages = [
      { role: "user", content: "Inspect the repository" },
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "glob_1", name: "glob", input: { pattern: "**/package.json" } }],
      },
    ]
    h.remotes.set(remote.id, { ...remote, messages: history })
    const result = { role: "user", content: [{ type: "tool_result", tool_use_id: "glob_1", content: "package.json" }] }
    const sent: Array<typeof Wire.Type> = []
    const response = yield* h.memory.middleware(child.id)(
      yield* h.request([...history, result], "anthropic"),
      (request) =>
        Effect.gen(function* () {
          sent.push(yield* read(request))
          return HttpClientResponse.fromWeb(
            request,
            Response.json({ error: { code: "conversation_history_conflict" } }, { status: 409 }),
          )
        }),
    )
    expect(response.status).toBe(409)
    yield* response.text
    expect(sent).toHaveLength(1)
    expect(sent[0]?.messages).toEqual([...history, result])
    expect((yield* h.sessions.get(parent.id)).metadata).toBeUndefined()
  }),
)

it.effect("creates separate backend conversations for parents, children and forks", () =>
  Effect.gen(function* () {
    const h = yield* harness
    const parent = yield* h.create()
    yield* h.admit(parent.id, "parent context")
    const request = yield* h.request([{ role: "user", content: "parent context" }])
    yield* h.memory
      .middleware(parent.id)(request, h.handler)
      .pipe(Effect.flatMap((response) => response.text))
    const saved = yield* h.sessions.get(parent.id)
    const child = yield* h.sessions.create({ parentID: parent.id })
    const fork = yield* h.sessions.fork({ sessionID: parent.id })
    yield* h.memory
      .middleware(child.id)(request, h.handler)
      .pipe(Effect.flatMap((response) => response.text))
    yield* h.memory
      .middleware(fork.id)(request, h.handler)
      .pipe(Effect.flatMap((response) => response.text))
    expect(h.calls.map((call) => call.body.conversation_id)).toEqual(["remote_1", "remote_2", "remote_3"])
    expect(h.calls.every((call) => call.body.memory_enabled)).toBe(true)
    expect((yield* h.sessions.get(parent.id)).metadata).toEqual(saved.metadata)
    expect(HoushiarMemory.binding(yield* h.sessions.get(child.id))?.sessionID).toBe(child.id)
  }),
)

it.effect("fetches the server revision and sends only a new user's delta", () =>
  Effect.gen(function* () {
    const h = yield* harness
    const session = yield* h.create()
    yield* h.admit(session.id, "hello")
    yield* h.memory
      .middleware(session.id)(yield* h.request([{ role: "user", content: "hello" }]), h.handler)
      .pipe(Effect.flatMap((response) => response.text))
    yield* h.admit(session.id, "next message")
    const messages = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "answer" },
      { role: "user", content: "next message" },
    ]
    yield* h.memory
      .middleware(session.id)(yield* h.request(messages), h.handler)
      .pipe(Effect.flatMap((response) => response.text))
    expect(h.calls[1]?.body.messages).toEqual([{ role: "user", content: "next message" }])
    expect(h.calls[1]?.body.conversation_id).toBe("remote_1")
    expect(h.calls[1]?.revision).toBe("1")
    expect(h.remotes.size).toBe(1)
  }),
)

it.effect("keeps tool results in the same conversation without replaying the user", () =>
  Effect.gen(function* () {
    const h = yield* harness
    const session = yield* h.create()
    yield* h.admit(session.id, "inspect")
    yield* h.memory
      .middleware(session.id)(yield* h.request([{ role: "user", content: "inspect" }]), h.handler)
      .pipe(Effect.flatMap((response) => response.text))
    const serverMessages = h.remotes.get("remote_1")!.messages
    const result = { role: "tool", tool_call_id: "call_1", content: "file contents" }
    yield* h.memory
      .middleware(session.id)(
        yield* h.request([
          { role: "user", content: "inspect" },
          {
            role: "assistant",
            content: "",
            tool_calls: [{ id: "call_1", type: "function", function: { name: "read", arguments: "{}" } }],
          },
          result,
        ]),
        h.handler,
      )
      .pipe(Effect.flatMap((response) => response.text))
    expect(h.calls[1]?.body.messages).toEqual([...serverMessages, result])
    const updatedServerMessages = h.remotes.get("remote_1")!.messages
    yield* h.admit(session.id, "steer one")
    yield* h.admit(session.id, "steer two")
    yield* h.memory
      .middleware(session.id)(
        yield* h.request([
          { role: "user", content: "inspect" },
          { role: "assistant", content: "tool request" },
          result,
          { role: "user", content: "steer one" },
          { role: "user", content: "steer two" },
        ]),
        h.handler,
      )
      .pipe(Effect.flatMap((response) => response.text))
    expect(h.calls[2]?.body.messages).toEqual([
      ...updatedServerMessages,
      result,
      { role: "user", content: "steer one" },
      { role: "user", content: "steer two" },
    ])
  }),
)

it.effect("rebuilds conflicts from a fresh server snapshot instead of repeating the failed request", () =>
  Effect.gen(function* () {
    const h = yield* harness
    const session = yield* h.create()
    yield* h.admit(session.id, "hello")
    yield* h.memory
      .middleware(session.id)(yield* h.request([{ role: "user", content: "hello" }]), h.handler)
      .pipe(Effect.flatMap((response) => response.text))
    yield* h.admit(session.id, "new message")
    const rejected: Array<typeof Wire.Type> = []
    const result = yield* h.memory.middleware(session.id)(
      yield* h.request([{ role: "user", content: "new message" }]),
      (request) =>
        Effect.gen(function* () {
          rejected.push(yield* read(request))
          if (rejected.length === 1) {
            const remote = h.remotes.get("remote_1")!
            h.remotes.set(remote.id, {
              ...remote,
              revision: 2,
              messages: [
                ...remote.messages,
                { role: "user", content: "other device" },
                { role: "assistant", content: "other answer" },
              ],
            })
            return HttpClientResponse.fromWeb(
              request,
              Response.json({ detail: { code: "conversation_revision_conflict" } }, { status: 409 }),
            )
          }
          return yield* h.handler(request)
        }),
    )
    yield* result.text
    expect(rejected).toHaveLength(2)
    expect(rejected[0]?.messages).toEqual([{ role: "user", content: "new message" }])
    expect(rejected[1]?.messages).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "answer" },
      { role: "user", content: "other device" },
      { role: "assistant", content: "other answer" },
      { role: "user", content: "new message" },
    ])
    expect(h.calls.at(-1)?.revision).toBe("2")
  }),
)

it.effect("holds a conversation lock until its response stream finishes", () =>
  Effect.gen(function* () {
    const h = yield* harness
    const first = yield* h.create()
    yield* h.admit(first.id, "first")
    yield* h.memory
      .middleware(first.id)(yield* h.request([{ role: "user", content: "first" }]), h.handler)
      .pipe(Effect.flatMap((response) => response.text))
    const second = yield* h.create()
    yield* h.sessions.setMetadata({
      sessionID: second.id,
      metadata: { houshiarConversation: { id: "remote_1", sessionID: second.id, protocol: "openai" } },
    })
    yield* h.admit(first.id, "slow")
    yield* h.admit(second.id, "second device")
    const done = yield* Deferred.make<void>()
    const entered: string[] = []
    const response = yield* h.memory.middleware(first.id)(
      yield* h.request([{ role: "user", content: "slow" }]),
      (request) =>
        Effect.gen(function* () {
          entered.push("first")
          const body = yield* Stream.toReadableStreamEffect(
            Stream.fromEffect(Deferred.await(done)).pipe(Stream.map(() => new TextEncoder().encode("done"))),
          )
          return HttpClientResponse.fromWeb(request, new Response(body))
        }),
    )
    const pending = yield* h.memory
      .middleware(second.id)(yield* h.request([{ role: "user", content: "second device" }]), (request) => {
        entered.push("second")
        return h.handler(request)
      })
      .pipe(
        Effect.flatMap((response) => response.text),
        Effect.forkChild({ startImmediately: true }),
      )
    yield* Effect.yieldNow
    expect(entered).toEqual(["first"])
    yield* Deferred.succeed(done, undefined)
    yield* response.text
    yield* Fiber.join(pending)
    expect(entered).toEqual(["first", "second"])
  }),
)
