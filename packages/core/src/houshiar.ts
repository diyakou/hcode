export * as HoushiarGateway from "./houshiar.js"

import { Houshiar } from "@opencode/schema/houshiar"
import { Model } from "@opencode/schema/model"
import { Provider } from "@opencode/schema/provider"
import { Effect, Option, Schema } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"
import { Variant } from "./variant.js"

const RemoteModel = Schema.Struct({
  id: Schema.NonEmptyString,
  name: Schema.optional(Schema.String),
  context_length: Schema.optional(Schema.NullOr(Schema.Int.check(Schema.isGreaterThan(0)))),
  max_output_tokens: Schema.optional(Schema.NullOr(Schema.Int.check(Schema.isGreaterThan(0)))),
})
const Catalog = Schema.Struct({ data: Schema.Array(Schema.Unknown) })
const decodeModel = Schema.decodeUnknownOption(RemoteModel)
const Amount = Schema.optional(Schema.NullOr(Schema.Number))
const Usage = Schema.Struct({
  authenticated: Schema.Boolean,
  limits: Schema.optional(
    Schema.Struct({
      max_context_tokens: Schema.optional(Schema.NullOr(Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)))),
      max_output_tokens: Schema.optional(Schema.NullOr(Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)))),
    }),
  ),
  context_limit: Schema.optional(Schema.NullOr(Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)))),
  context: Schema.optional(
    Schema.Struct({
      limit: Schema.optional(Schema.NullOr(Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)))),
    }),
  ),
  plan: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
  expires_at: Schema.optional(Schema.NullOr(Schema.String)),
  user_token_balance: Amount,
  billing: Schema.optional(
    Schema.Struct({
      credits_used: Amount,
      credits_limit: Amount,
      credits_remaining: Amount,
      five_hour_credits_used: Amount,
      five_hour_credits_limit: Amount,
      five_hour_credits_remaining: Amount,
      requests_used: Amount,
      requests_limit: Amount,
    }),
  ),
})

export const models = Effect.fn("Houshiar.models")(function* (
  http: HttpClient.HttpClient,
  key: string,
  limitsOrUsage?: (typeof Usage.Type)["limits"] | typeof Usage.Type,
) {
  const limits = limitsOrUsage && "limits" in limitsOrUsage ? limitsOrUsage.limits : limitsOrUsage
  const planContextLimit =
    (limitsOrUsage && "context_limit" in limitsOrUsage
      ? limitsOrUsage.context_limit ?? limitsOrUsage.context?.limit
      : undefined) ?? limits?.max_context_tokens
  const maxContext = planContextLimit || limits?.max_context_tokens || Infinity
  const maxOutput = limits?.max_output_tokens || Infinity
  const response = yield* HttpClient.filterStatusOk(http)
    .execute(HttpClientRequest.get(`${Houshiar.baseURL}/models`).pipe(HttpClientRequest.bearerToken(key)))
    .pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(Catalog)), Effect.timeout("20 seconds"))
  return response.data
    .flatMap((item) => {
      const remote = Option.getOrUndefined(decodeModel(item))
      if (!remote) return []
      const model = Model.Info.default(Provider.ID.make(Houshiar.id), Model.ID.make(remote.id))
      const isClaude = remote.id.toLowerCase().includes("claude")
      const context = Math.min(remote.context_length ?? model.limit.context, maxContext)
      const output = Math.min(
        remote.max_output_tokens ?? model.limit.output,
        maxOutput,
        context,
      )
      const configured: Model.Info = {
        ...model,
        name: remote.name || remote.id,
        // The gateway accepts the complete catalogue ID, including account/provider prefixes.
        package: isClaude ? "@opencode/ai/providers/anthropic-compatible" : "@opencode/ai/providers/openai-compatible",
        settings: { baseURL: Houshiar.baseURL },
        limit: {
          context,
          output,
        },
      }
      const variants = Variant.resolve(configured)
      const defaultThinking =
        variants.find((variant) => variant.id === "high")?.settings ??
        variants.find((variant) => variant.id === "thinking")?.settings
      return [
        {
          ...configured,
          settings: {
            ...configured.settings,
            ...(isClaude ? defaultThinking : {}),
          },
          variants,
        },
      ]
    })
    .toSorted((a, b) => a.id.localeCompare(b.id))
})

export const fiveHour = Effect.fn("Houshiar.fiveHour")(function* (http: HttpClient.HttpClient, key: string, model?: string) {
  const request = HttpClientRequest.get(`${Houshiar.baseURL}/usage/five-hour`).pipe(
    HttpClientRequest.bearerToken(key),
  )
  const response = yield* HttpClient.filterStatusOk(http)
    .execute(model ? HttpClientRequest.setUrlParam(request, "model", model) : request)
    .pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(Houshiar.FiveHourStatus)), Effect.timeout("20 seconds"))
  return response
})

export const usage = Effect.fn("Houshiar.usage")(function* (http: HttpClient.HttpClient, key: string) {
  const response = yield* HttpClient.filterStatusOk(http)
    .execute(HttpClientRequest.get(`${Houshiar.baseURL}/usage`).pipe(HttpClientRequest.bearerToken(key)))
    .pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(Usage)), Effect.timeout("20 seconds"))
  if (!response.authenticated) return yield* Effect.fail(new Error("Houshiar API key is invalid"))
  return response
})

export function summary(usage: typeof Usage.Type) {
  return [
    `Houshiar · ${usage.plan ?? "custom"} · ${usage.status ?? "active"}`,
    usage.billing?.credits_limit
      ? `Monthly credits: ${usage.billing.credits_used ?? 0} / ${usage.billing.credits_limit} (${usage.billing.credits_remaining ?? 0} remaining)`
      : undefined,
    usage.billing?.five_hour_credits_limit
      ? `5-hour credits: ${usage.billing.five_hour_credits_used ?? 0} / ${usage.billing.five_hour_credits_limit} (${usage.billing.five_hour_credits_remaining ?? 0} remaining)`
      : undefined,
    usage.billing?.requests_limit
      ? `Monthly requests: ${usage.billing.requests_used ?? 0} / ${usage.billing.requests_limit}`
      : undefined,
    usage.user_token_balance != null ? `Token balance: ${usage.user_token_balance}` : undefined,
    usage.expires_at ? `Expires: ${usage.expires_at}` : undefined,
  ]
    .filter((line) => line !== undefined)
    .join("\n")
}
