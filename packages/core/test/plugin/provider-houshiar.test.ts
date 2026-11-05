import { expect } from "bun:test"
import { Effect, Fiber, Stream } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { Bus } from "@opencode/core/bus"
import { Credential } from "@opencode/core/credential"
import { Integration } from "@opencode/core/integration"
import { Plugin } from "@opencode/core/plugin"
import { PluginHost } from "@opencode/core/plugin/host"
import { HoushiarPlugin } from "@opencode/core/plugin/provider/houshiar"
import { Provider } from "@opencode/core/provider"
import { Rpc } from "@opencode/core/rpc"
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
      const models = [{ id: "1hosh/claude-sonnet" }, { id: "j-gpt/gpt-model" }]
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
            .pipe(Effect.map((snapshot) => snapshot.records.get(Provider.ID.make(Houshiar.id))?.models.size === 2)),
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
      ).toEqual([Model.ID.make("1hosh/claude-sonnet"), Model.ID.make("j-gpt/gpt-model")])
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
