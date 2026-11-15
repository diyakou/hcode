import { expect } from "bun:test"
import { Effect, Fiber, Layer, Stream } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { Bus } from "@opencode/core/bus"
import { Credential } from "@opencode/core/credential"
import { Integration } from "@opencode/core/integration"
import { Plugin } from "@opencode/core/plugin"
import { PluginHost } from "@opencode/core/plugin/host"
import { PluginHooks } from "@opencode/core/plugin/hooks"
import { Agent } from "@opencode/schema/agent"
import { Session } from "@opencode/core/session"
import { HoushiarPlugin } from "@opencode/core/plugin/provider/houshiar"
import { Provider } from "@opencode/core/provider"
import { Rpc } from "@opencode/core/rpc"
import { Houshiar } from "@opencode/schema/houshiar"
import { Model } from "@opencode/core/model"
import { testEffect } from "../lib/effect"
import { makePluginTestLayer, PluginTestLayer } from "./fixture"
import { httpClient } from "@opencode/util/effect/app-node-platform"

const it = testEffect(PluginTestLayer)

it.effect("keeps only Houshiar model access and API-key sign-in while preserving MCP sign-ins", () =>
  Effect.gen(function* () {
    const plugin = yield* Plugin.Service
    const host = yield* PluginHost.make(plugin)
    const providers = yield* Provider.Service
    const integrations = yield* Integration.Service
    yield* host.integration.transform((editor) => {
      editor.method.update({ integrationID: "openai", method: { type: "key" } })
      editor.method.update({ integrationID: "mcp_example", method: { type: "key" } })
      editor.method.update({ integrationID: Houshiar.id, method: { type: "env", names: ["OTHER_API_KEY"] } })
    })
    yield* host.provider.transform((editor) => {
      editor.add({
        info: { ...Provider.Info.empty(Provider.ID.make("openai")), activation: "enabled" },
        models: [],
      })
    })
    yield* HoushiarPlugin.effect(host)
    expect((yield* integrations.list()).map((item) => item.id).sort()).toEqual([
      Integration.ID.make(Houshiar.id),
      Integration.ID.make("mcp_example"),
    ])
    const integration = yield* integrations.get(Integration.ID.make(Houshiar.id))
    expect(integration?.name).toBe("Houshiar")
    expect(integration?.methods.map((method) => method.type)).toEqual(["key"])
    expect(Array.from((yield* providers.snapshot()).records.keys())).toEqual([Provider.ID.make(Houshiar.id)])
    expect(yield* providers.available()).toEqual([])
  }),
)
;["startup", "connect"].forEach((timing) =>
  it.effect(`discovers models with a saved API key at ${timing}`, () =>
    Effect.gen(function* () {
      const plugin = yield* Plugin.Service
      const host = yield* PluginHost.make(plugin)
      const providers = yield* Provider.Service
      const integrations = yield* Integration.Service
      const bus = yield* Bus.Service
      const rpc = yield* Rpc.Service
      const credentials = yield* Credential.Service
      const models = [{ id: "1hosh/claude-sonnet" }, { id: "j-gpt/gpt-model" }, { id: Houshiar.fallbackModel }]
      const http = HttpClient.make((request) => {
        expect(request.headers.authorization).toBe("Bearer saved-key")
        expect(request.url.startsWith(Houshiar.baseURL)).toBe(true)
        return Effect.succeed(
          HttpClientResponse.fromWeb(
            request,
            Response.json(
              request.url.endsWith("/usage")
                ? {
                    authenticated: true,
                    status: "active",
                    limits: { max_context_tokens: 32000, max_output_tokens: 4096 },
                  }
                : { data: models },
            ),
          ),
        )
      })
      if (timing === "startup")
        yield* credentials.create({
          integrationID: Integration.ID.make(Houshiar.id),
          value: Credential.Key.make({ type: "key", key: "saved-key" }),
        })
      const ready = yield* bus.subscribe(Provider.Event.Updated).pipe(
        Stream.filterEffect(() =>
          providers
            .snapshot()
            .pipe(Effect.map((snapshot) => snapshot.records.get(Provider.ID.make(Houshiar.id))?.models.size === 4)),
        ),
        Stream.take(1),
        Stream.runDrain,
        Effect.forkChild({ startImmediately: true }),
      )
      yield* HoushiarPlugin.effect(host).pipe(Effect.provideService(HttpClient.HttpClient, http))
      if (timing === "connect")
        yield* integrations.connection.key({ integrationID: Integration.ID.make(Houshiar.id), key: "saved-key" })
      yield* Fiber.join(ready)
      expect((yield* providers.available()).map((provider) => provider.id)).toEqual([Provider.ID.make(Houshiar.id)])
      expect(
        (yield* providers.snapshot()).records
          .get(Provider.ID.make(Houshiar.id))
          ?.models.get(Model.ID.make("1hosh/claude-sonnet"))?.limit,
      ).toEqual({ context: 32000, output: 4096 })
      expect(
        Array.from((yield* providers.snapshot()).records.get(Provider.ID.make(Houshiar.id))!.models.keys()),
      ).toEqual([
        Model.ID.make(Houshiar.autoModel),
        Model.ID.make("1hosh/claude-sonnet"),
        Model.ID.make("j-gpt/gpt-model"),
        Model.ID.make(Houshiar.fallbackModel),
      ])
      const catalog = yield* Model.Service
      expect((yield* catalog.default())?.id).toBe(Model.ID.make(Houshiar.autoModel))
      models.push({ id: "new-model" })
      expect(yield* rpc.client(Houshiar.Definition).refresh({})).toBe(true)
      expect(
        (yield* providers.snapshot()).records
          .get(Provider.ID.make(Houshiar.id))
          ?.models.has(Model.ID.make("new-model")),
      ).toBe(true)
    }),
  ),
)

it.effect("keeps auxiliary requests stateless and strips inherited conversation identity", () =>
  Effect.gen(function* () {
    const plugin = yield* Plugin.Service
    const host = yield* PluginHost.make(plugin)
    const hooks = yield* PluginHooks.Service
    yield* HoushiarPlugin.effect(host)
    yield* Effect.forEach(["messages", "chat/completions"], (route) =>
      Effect.forEach(["title", "compaction", "generate"] as const, (kind) =>
        Effect.gen(function* () {
          const request = new Request(`${Houshiar.baseURL}/${route}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer user-key",
              "X-Conversation-ID": "inherited-conversation",
              "X-Memory-Revision": "17",
            },
            body: JSON.stringify({
              model: "test-model",
              messages: [{ role: "user", content: "independent agent history" }],
              stream: true,
              conversation_id: "old-conversation",
              memory_enabled: true,
            }),
          })
          const event = yield* hooks.trigger("session", "http.request", {
            sessionID: Session.ID.make("ses_client_history"),
            agent: Agent.ID.make("build"),
            kind,
            model: Model.Ref.make({ providerID: Provider.ID.make(Houshiar.id), id: Model.ID.make("test-model") }),
            request,
          })
          expect(event.request.headers.has("x-conversation-id")).toBe(false)
          expect(event.request.headers.has("x-memory-revision")).toBe(false)
          expect(event.request.headers.get("authorization")).toBe("Bearer user-key")
          expect(yield* Effect.promise(() => event.request.json())).toEqual({
            model: "test-model",
            messages: [{ role: "user", content: "independent agent history" }],
            stream: true,
            memory_enabled: false,
          })
          expect(yield* Effect.promise(() => request.json())).toMatchObject({
            conversation_id: "old-conversation",
            memory_enabled: true,
          })
        }),
      ),
    )
    expect(yield* hooks.has("session", "http.response", Houshiar.id)).toBe(false)
  }),
)

testEffect(Layer.empty).effect("lists account conversations and restores the selected backend chat through RPC", () => {
  const remote = Houshiar.Conversation.make({
    id: "account_chat",
    protocol: "anthropic",
    revision: 3,
    created_at: "2026-11-15T08:00:00Z",
    updated_at: "2026-11-15T08:01:00Z",
  })
  const http = HttpClient.make((request) => {
    expect(request.headers.authorization).toBe("Bearer saved-key")
    if (request.url.endsWith("/conversations")) {
      expect(request.urlParams.params).toEqual([
        ["limit", "20"],
        ["offset", "20"],
      ])
      return Effect.succeed(HttpClientResponse.fromWeb(request, Response.json({ data: [remote] })))
    }
    if (request.url.endsWith("/conversations/account_chat"))
      return Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          Response.json({
            ...remote,
            messages: [
              { role: "user", content: "remote question" },
              { role: "assistant", content: "remote answer" },
            ],
            summary: "",
            system: null,
          }),
        ),
      )
    return Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        Response.json(
          request.url.endsWith("/usage") ? { authenticated: true } : { data: [{ id: Houshiar.fallbackModel }] },
        ),
      ),
    )
  })
  return Effect.gen(function* () {
    const plugin = yield* Plugin.Service
    const host = yield* PluginHost.make(plugin)
    const providers = yield* Provider.Service
    const credentials = yield* Credential.Service
    const bus = yield* Bus.Service
    const rpc = yield* Rpc.Service
    const sessions = yield* Session.Service
    yield* credentials.create({
      integrationID: Integration.ID.make(Houshiar.id),
      value: Credential.Key.make({ type: "key", key: "saved-key" }),
    })
    const ready = yield* bus.subscribe(Provider.Event.Updated).pipe(
      Stream.filterEffect(() =>
        providers
          .snapshot()
          .pipe(Effect.map((snapshot) => snapshot.records.get(Provider.ID.make(Houshiar.id))?.models.size === 2)),
      ),
      Stream.take(1),
      Stream.runDrain,
      Effect.forkChild({ startImmediately: true }),
    )
    yield* HoushiarPlugin.effect(host).pipe(Effect.provideService(HttpClient.HttpClient, http))
    yield* Fiber.join(ready)
    const client = rpc.client(Houshiar.Definition)
    expect(yield* client.conversations({ offset: 20 })).toEqual({ data: [remote] })
    expect((yield* client.conversation({ id: remote.id })).revision).toBe(3)
    const restored = yield* client.continueConversation({ id: remote.id })
    expect((yield* sessions.get(restored.sessionID)).model?.id).toBe(Model.ID.make(Houshiar.autoModel))
    expect((yield* sessions.get(restored.sessionID)).metadata).toMatchObject({
      houshiarConversation: { id: remote.id, sessionID: restored.sessionID, protocol: "anthropic" },
    })
    expect((yield* sessions.context(restored.sessionID)).map((message) => message.type)).toEqual(["user", "assistant"])
    expect(yield* sessions.inbox(restored.sessionID)).toEqual([])
  }).pipe(
    Effect.provide(
      makePluginTestLayer(undefined, undefined, [httpClient.replace(Layer.succeed(HttpClient.HttpClient, http))]),
    ),
  )
})
