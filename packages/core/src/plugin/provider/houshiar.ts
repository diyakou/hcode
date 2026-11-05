import { define } from "@opencode/plugin/effect/plugin"
import { Houshiar } from "@opencode/schema/houshiar"
import { Integration } from "@opencode/schema/integration"
import type { Model } from "@opencode/schema/model"
import { Duration, Effect } from "effect"
import { HttpClient, HttpClientError } from "effect/http"
import { HoushiarGateway } from "../../houshiar.js"
import { IntegrationConnection } from "../../integration/connection.js"
import { Provider } from "../../provider.js"
import { SharedCache } from "../../shared-cache.js"
import type { PluginInternal } from "../internal.js"
import { ProviderRefresh } from "./refresh.js"

export const HoushiarPlugin = define({
  id: "houshiar.provider",
  effect: Effect.fn(function* (ctx) {
    const http = yield* HttpClient.HttpClient
    const cache = yield* SharedCache.Service
    yield* ctx.integration.transform((integrations) => {
      for (const integration of integrations.list()) {
        if (integration.id !== Houshiar.id && !integration.id.startsWith("mcp_")) integrations.remove(integration.id)
      }
      integrations.update(Houshiar.id, (integration) => {
        integration.name = "Houshiar"
      })
      for (const method of integrations.method.list(Houshiar.id)) integrations.method.remove(Houshiar.id, method)
      integrations.method.update({ integrationID: Houshiar.id, method: { type: "key", label: "Houshiar API key" } })
    })

    const key = Effect.fn("Houshiar.key")(function* () {
      const connection = yield* ctx.integration.connection.active(Houshiar.id)
      const credential = connection ? yield* ctx.integration.connection.resolve(connection) : undefined
      if (credential?.type !== "key") return yield* Effect.fail(new Error("Connect your Houshiar API key first"))
      return { connection, key: credential.key }
    })
    const discovered = yield* ProviderRefresh.start({
      integrationID: Houshiar.id,
      interval: Duration.seconds(30),
      // SAFETY: discovery starts empty and only publishes validated gateway models with their source connection.
      initial: { models: [] } as {
        readonly models: readonly Model.Info[]
        readonly connection?: Effect.Success<ReturnType<typeof ctx.integration.connection.active>>
      },
      active: ctx.integration.connection.active(Houshiar.id),
      reload: ctx.provider.reload(),
      load: Effect.fn(function* (_, options) {
        const connection = yield* ctx.integration.connection.active(Houshiar.id)
        if (!connection) return { connection, value: { models: [] } }
        const value = yield* key().pipe(
          Effect.flatMap((access) =>
            cache.get({
              key: `houshiar:models:${IntegrationConnection.key(connection)}:${SharedCache.fingerprint(access.key)}`,
              ...options,
              load: HoushiarGateway.usage(http, access.key).pipe(
                Effect.tap(() =>
                  ctx.integration.connection.status({ integrationID: Houshiar.id, connection, status: undefined }),
                ),
                Effect.flatMap((usage) => HoushiarGateway.models(http, access.key, usage.limits)),
                Effect.tapError((error) => {
                  if (!HttpClientError.isHttpClientError(error) || error.reason._tag !== "StatusCodeError")
                    return Effect.void
                  if (![401, 403].includes(error.reason.response.status)) return Effect.void
                  return ctx.integration.connection.status({
                    integrationID: Houshiar.id,
                    connection,
                    status: { status: "needs_auth", message: "Check your Houshiar API key" },
                  })
                }),
              ),
            }),
          ),
          Effect.orElseSucceed(() => []),
        )
        return { connection, value: { models: value, connection } }
      }),
    })

    yield* ctx.provider.transform((providers) => {
      for (const item of providers.list()) providers.remove(item.provider.id)
      providers.add({
        info: {
          id: Provider.ID.make(Houshiar.id),
          integrationID: Integration.ID.make(Houshiar.id),
          name: "Houshiar",
          activation: "auto",
          package: "@opencode/ai/providers/openai-compatible",
          settings: { baseURL: Houshiar.baseURL, provider: Houshiar.id },
        },
        models: discovered.current.models,
        sourceConnection: discovered.current.connection,
      })
    })
    yield* ctx.rpc
      .register(Houshiar.Definition, {
        refresh: (_, context) =>
          discovered.refresh.pipe(
            Effect.andThen(() =>
              discovered.current.models.length > 0
                ? Effect.succeed(true)
                : Effect.fail(
                    context.error(
                      "unavailable",
                      "Unable to load models. Check your API key and connection.",
                      "models_unavailable",
                    ),
                  ),
            ),
          ),
        usage: (_, context) =>
          key().pipe(
            Effect.flatMap((access) => HoushiarGateway.usage(http, access.key)),
            Effect.map(HoushiarGateway.summary),
            Effect.mapError(() =>
              context.error(
                "unavailable",
                "Unable to load Houshiar usage. Check your API key and connection.",
                "usage_unavailable",
              ),
            ),
          ),
      })
      .pipe(Effect.orDie)
  }),
} satisfies PluginInternal.InternalPlugin)
