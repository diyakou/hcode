export * as HoushiarMemory from "./houshiar-memory.js"

import { Houshiar } from "@opencode/schema/houshiar"
import { Session } from "@opencode/schema/session"
import { makeGlobalNode } from "@opencode/util/effect/app-node"
import { httpClient } from "@opencode/util/effect/app-node-platform"
import type { HttpMiddleware } from "@opencode/ai/route"
import { Context, Effect, Exit, Layer, Option, Schema, Scope, Semaphore, Stream, Struct } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"
import { Bus } from "./bus.js"
import { HoushiarGateway } from "./houshiar.js"
import { SessionEvent } from "./session/event.js"
import { SessionStore } from "./session/store.js"

const Binding = Schema.Struct({
  id: Schema.NonEmptyString,
  sessionID: Session.ID,
  protocol: Houshiar.Conversation.fields.protocol,
  promptID: Schema.optional(Schema.String),
})
const decodeBinding = Schema.decodeUnknownOption(Binding)
export const binding = (session: Session.Info) => {
  const value = Option.getOrUndefined(decodeBinding(session.metadata?.houshiarConversation))
  return value?.sessionID === session.id ? value : undefined
}

const Message = Schema.Record(Schema.String, Schema.Json)
const Body = Schema.StructWithRest(Schema.Struct({ messages: Schema.Array(Message) }), [
  Schema.Record(Schema.String, Schema.Json),
])
const decodeBody = Schema.decodeUnknownEffect(Schema.fromJsonString(Body))
const decodeConflict = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Union([
      Schema.Struct({ code: Schema.String }),
      Schema.Struct({ detail: Schema.Struct({ code: Schema.String }) }),
      Schema.Struct({ error: Schema.Struct({ code: Schema.String }) }),
    ]),
  ),
)

export class SyncError extends Schema.TaggedError<SyncError>()("HoushiarMemory.SyncError", {
  message: Schema.String,
}) {}

export interface Interface {
  readonly middleware: (sessionID: Session.ID) => HttpMiddleware
}
export class Service extends Context.Service<Service, Interface>()("@opencode/HoushiarMemory") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient
    const store = yield* SessionStore.Service
    const bus = yield* Bus.Service
    const locks = new Map<string, Semaphore.Semaphore>()
    const lock = (key: string) => {
      const existing = locks.get(key)
      if (existing) return existing
      const value = Semaphore.makeUnsafe(1)
      locks.set(key, value)
      return value
    }
    const save = Effect.fn("HoushiarMemory.save")(function* (sessionID: Session.ID, value: typeof Binding.Type) {
      const session = yield* store.get(sessionID)
      if (!session) return
      const previous = binding(session)
      if (previous?.id === value.id && previous.protocol === value.protocol && previous.promptID === value.promptID)
        return
      yield* bus.publish(SessionEvent.MetadataUpdated, {
        sessionID,
        metadata: {
          ...Struct.omit(session.metadata ?? {}, ["houshiarConversationID", "houshiarServerRevision"]),
          houshiarConversation: value,
        },
      })
    })

    return Service.of({
      middleware: (sessionID) => (request, handler) =>
        Effect.gen(function* () {
          const scope = yield* Scope.make()
          return yield* Effect.gen(function* () {
            yield* lock(`session:${sessionID}`).takeScoped(1).pipe(Effect.provideService(Scope.Scope, scope))
            const session = yield* store.get(sessionID)
            if (!session) return yield* new SyncError({ message: "Session no longer exists" })
            const authorization =
              request.headers.authorization ??
              (request.headers["x-api-key"] ? `Bearer ${request.headers["x-api-key"]}` : undefined)
            if (!authorization) return yield* new SyncError({ message: "Connect your Houshiar API key first" })
            const protocol = new URL(request.url).pathname.endsWith("/messages") ? "anthropic" : "openai"
            const previous = binding(session)
            const legacy =
              !session.parentID && !session.fork && typeof session.metadata?.houshiarConversationID === "string"
                ? session.metadata.houshiarConversationID
                : undefined
            const identity =
              previous ??
              (legacy
                ? Binding.make({ id: legacy, sessionID, protocol })
                : yield* HoushiarGateway.createConversation(http, authorization, protocol).pipe(
                    Effect.map((created) => ({ id: created.id, sessionID, protocol: created.protocol })),
                  ))
            if (!previous) yield* save(sessionID, identity)
            yield* lock(`conversation:${identity.id}`).takeScoped(1).pipe(Effect.provideService(Scope.Scope, scope))
            const snapshot = yield* HoushiarGateway.conversation(http, authorization, identity.id)
            if (snapshot.protocol !== identity.protocol)
              yield* save(sessionID, { ...identity, protocol: snapshot.protocol })
            if (snapshot.protocol !== protocol)
              return yield* new SyncError({
                message:
                  "This saved conversation requires its original protocol. Its connection is synchronized; retry your message.",
              })
            const body = yield* HttpClientRequest.toWeb(request).pipe(
              Effect.flatMap((web) => Effect.promise(() => web.text())),
              Effect.flatMap(decodeBody),
            )
            const prompt = (yield* store.context(sessionID)).findLast((message) => message.type === "user")
            const messages = body.messages.filter(
              (message) => message.role !== "system" && message.role !== "developer",
            )
            const systems = body.messages.filter((message) => message.role === "system" || message.role === "developer")
            const samePrompt = prompt !== undefined && previous?.promptID === prompt.id
            const assistantBoundary = messages.findLastIndex((message) => message.role === "assistant") + 1
            const userBoundary = Math.max(
              0,
              messages.findLastIndex((message) => message.role === "user" && !toolResults(message)),
            )
            // Preserve tool results and batches of steers immediately before the new user message.
            const boundary = samePrompt ? assistantBoundary : Math.min(userBoundary, assistantBoundary)
            const delta = snapshot.messages.length > 0 ? messages.slice(Math.max(0, boundary)) : messages
            if (delta.length === 0)
              return yield* new SyncError({ message: "No new messages to send to this conversation" })
            const send = (history: typeof Houshiar.ConversationHistory.Type, rebuilt: boolean) =>
              HttpClientRequest.bodyJson({
                ...Struct.omit(body, ["conversation_id"]),
                messages: [...systems, ...(rebuilt ? history.messages : []), ...delta],
                conversation_id: history.id,
                memory_enabled: true,
              })(
                request.pipe(
                  HttpClientRequest.removeHeader("content-length"),
                  HttpClientRequest.removeHeader("x-api-key"),
                  HttpClientRequest.setHeader("authorization", authorization),
                  HttpClientRequest.setHeader("x-conversation-id", history.id),
                  HttpClientRequest.setHeader("x-memory-revision", String(history.revision)),
                ),
              ).pipe(Effect.flatMap(handler))
            // Tool continuations must anchor to the backend's own assistant message. Its tool-call
            // blocks and reasoning metadata can differ from the transcript reconstructed locally.
            const continuation = delta.some((message) => message.role === "tool" || toolResults(message))
            const initial = yield* send(snapshot, continuation)
            const rejected = initial.status === 409 ? yield* initial.text : undefined
            const unchanged =
              rejected === undefined
                ? initial
                : HttpClientResponse.fromWeb(
                    initial.request,
                    new Response(rejected, { status: initial.status, headers: initial.headers }),
                  )
            const conflict = rejected !== undefined ? Option.getOrUndefined(decodeConflict(rejected)) : undefined
            const code =
              conflict &&
              ("detail" in conflict ? conflict.detail.code : "error" in conflict ? conflict.error.code : conflict.code)
            const response =
              code === "conversation_history_conflict" || code === "conversation_revision_conflict"
                ? yield* HoushiarGateway.conversation(http, authorization, identity.id).pipe(
                    Effect.flatMap((fresh) =>
                      fresh.revision === snapshot.revision &&
                      (fresh.messages.length === 0 ||
                        (continuation && JSON.stringify(fresh.messages) === JSON.stringify(snapshot.messages)))
                        ? Effect.succeed(unchanged)
                        : send(fresh, true),
                    ),
                  )
                : unchanged
            const stream = response.stream.pipe(
              Stream.onExit((exit) =>
                Exit.isSuccess(exit) && response.status < 400
                  ? save(sessionID, { ...identity, ...(prompt ? { promptID: prompt.id } : {}) })
                  : Effect.void,
              ),
              Stream.ensuring(Scope.close(scope, Exit.void)),
            )
            return HttpClientResponse.fromWeb(
              response.request,
              new Response(yield* Stream.toReadableStreamEffect(stream), {
                status: response.status,
                headers: response.headers,
              }),
            )
          }).pipe(
            Effect.onExit((exit) => (Exit.isFailure(exit) ? Scope.close(scope, exit) : Effect.void)),
            Effect.mapError((error) =>
              error instanceof SyncError
                ? error
                : new SyncError({ message: "Unable to synchronize Houshiar conversation history" }),
            ),
            Effect.catchTag("HoushiarMemory.SyncError", (error) =>
              Effect.succeed(
                HttpClientResponse.fromWeb(
                  request,
                  Response.json(
                    {
                      error: {
                        type: "invalid_request_error",
                        code: "conversation_sync_failed",
                        message: error.message,
                      },
                    },
                    { status: 400 },
                  ),
                ),
              ),
            ),
          )
        }),
    })
  }),
)

function toolResults(message: typeof Message.Type) {
  return (
    Array.isArray(message.content) &&
    message.content.length > 0 &&
    message.content.every(
      (block) => block !== null && typeof block === "object" && !Array.isArray(block) && block.type === "tool_result",
    )
  )
}

export const node = makeGlobalNode({ service: Service, layer, deps: [SessionStore.node, Bus.node, httpClient] })
