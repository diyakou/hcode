import { expect } from "bun:test"
import { Effect, Fiber, Stream } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { Bus } from "@opencode/core/bus"
import { Integration } from "@opencode/core/integration"
import { Plugin } from "@opencode/core/plugin"
import { PluginHost } from "@opencode/core/plugin/host"
import { HoushiarPlugin } from "@opencode/core/plugin/provider/houshiar"
import { Provider } from "@opencode/core/provider"
import { Houshiar } from "@opencode/schema/houshiar"
import { Model } from "@opencode/schema/model"
import { testEffect } from "../lib/effect"
import { PluginTestLayer } from "./fixture"

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

it.effect("discovers models after a user's saved API key is connected", () =>
  Effect.gen(function* () {
    const plugin = yield* Plugin.Service
    const host = yield* PluginHost.make(plugin)
    const providers = yield* Provider.Service
    const integrations = yield* Integration.Service
    const bus = yield* Bus.Service
    const http = HttpClient.make((request) => {
      expect(request.headers.authorization).toBe("Bearer saved-key")
      expect(request.url.startsWith(Houshiar.baseURL)).toBe(true)
      return Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          Response.json(
            request.url.endsWith("/usage")
              ? { authenticated: true, status: "active" }
              : { data: [{ id: "1hosh/claude-sonnet" }, { id: "j-gpt/gpt-model" }] },
          ),
        ),
      )
    })
    yield* HoushiarPlugin.effect(host).pipe(Effect.provideService(HttpClient.HttpClient, http))
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
    yield* integrations.connection.key({ integrationID: Integration.ID.make(Houshiar.id), key: "saved-key" })
    yield* Fiber.join(ready)
    expect((yield* providers.available()).map((provider) => provider.id)).toEqual([Provider.ID.make(Houshiar.id)])
    expect(Array.from((yield* providers.snapshot()).records.get(Provider.ID.make(Houshiar.id))!.models.keys())).toEqual(
      [Model.ID.make("1hosh/claude-sonnet"), Model.ID.make("j-gpt/gpt-model")],
    )
  }),
)
