import { expect } from "bun:test"
import { Effect } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { HoushiarGateway } from "@opencode/core/houshiar"
import { Houshiar } from "@opencode/schema/houshiar"
import { Model } from "@opencode/schema/model"
import { it } from "./lib/effect"

it.effect("loads gateway IDs without stripping prefixes and selects the matching wire protocol", () =>
  Effect.gen(function* () {
    const http = HttpClient.make((request) => {
      expect(request.url).toBe(`${Houshiar.baseURL}/models`)
      expect(request.headers.authorization).toBe("Bearer user-key")
      return Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          Response.json({
            data: [
              { id: "1hosh/claude-sonnet", name: "Claude", context_length: 128000, max_output_tokens: 8192 },
              { id: "j-gpt/gpt-model", name: "GPT" },
              { id: "" },
              { name: "broken" },
            ],
          }),
        ),
      )
    })
    const models = yield* HoushiarGateway.models(http, "user-key")
    expect(models.map((model) => model.modelID)).toEqual([
      Model.ID.make("1hosh/claude-sonnet"),
      Model.ID.make("j-gpt/gpt-model"),
    ])
    expect(models.every((model) => model.providerID === Houshiar.id)).toBe(true)
    expect(models[0].package).toBe("@opencode/ai/providers/anthropic-compatible")
    expect(models[0].limit).toEqual({ context: 128000, output: 8192 })
    expect(models[1].package).toBe("@opencode/ai/providers/openai-compatible")
    expect(models.every((model) => model.settings?.baseURL === Houshiar.baseURL)).toBe(true)
  }),
)

it.effect("reads authenticated usage from the backend's singular usage endpoint", () =>
  Effect.gen(function* () {
    const http = HttpClient.make((request) => {
      expect(request.url).toBe(`${Houshiar.baseURL}/usage`)
      expect(request.headers.authorization).toBe("Bearer user-key")
      return Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          Response.json({
            authenticated: true,
            plan: "subscription",
            status: "active",
            user_token_balance: 0,
            billing: {
              credits_used: 20,
              credits_limit: 100,
              credits_remaining: 80,
              five_hour_credits_limit: 10,
              five_hour_credits_remaining: 6,
            },
          }),
        ),
      )
    })
    const summary = HoushiarGateway.summary(yield* HoushiarGateway.usage(http, "user-key"))
    expect(summary).toContain("20 / 100 (80 remaining)")
    expect(summary).toContain("6 remaining")
    expect(summary).toContain("Token balance: 0")
    expect(summary).not.toContain("user-key")
  }),
)

it.effect("rejects invalid keys and malformed catalogue envelopes", () =>
  Effect.gen(function* () {
    const http = HttpClient.make((request) =>
      Effect.succeed(HttpClientResponse.fromWeb(request, Response.json({ authenticated: false }))),
    )
    expect(yield* HoushiarGateway.usage(http, "invalid").pipe(Effect.isFailure)).toBe(true)
    expect(yield* HoushiarGateway.models(http, "invalid").pipe(Effect.isFailure)).toBe(true)
  }),
)
