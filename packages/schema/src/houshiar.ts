export * as Houshiar from "./houshiar.js"

import { Schema } from "effect"
import { Rpc } from "./rpc.js"

export const id = "houshiar"
export const baseURL = "https://api.houshiar-ai.ir/v1"

export const FiveHourStatus = Schema.Struct({
  managed: Schema.Boolean,
  plan: Schema.optional(Schema.String),
  scope: Schema.optional(Schema.String),
  five_hour: Schema.NullOr(
    Schema.Struct({
      window_seconds: Schema.Number,
      window_start: Schema.String,
      checked_at: Schema.String,
      enforced: Schema.Boolean,
      exempt: Schema.Boolean,
      limit_reached: Schema.Boolean,
      credits: Schema.NullOr(Schema.Struct({ limit: Schema.NullOr(Schema.Number), used: Schema.Number, reserved: Schema.Number, remaining: Schema.Number })),
      requests: Schema.NullOr(Schema.Struct({ limit: Schema.NullOr(Schema.Number), used: Schema.Number, remaining: Schema.Number })),
      next_release_at: Schema.NullOr(Schema.String),
      window_clears_at: Schema.NullOr(Schema.String),
    }),
  ),
  models: Schema.NullOr(
    Schema.Struct({
      selected: Schema.NullOr(Schema.String),
      last_served: Schema.NullOr(Schema.String),
      last_provider: Schema.NullOr(Schema.String),
      last_served_at: Schema.NullOr(Schema.String),
      next_request_expected: Schema.NullOr(Schema.String),
      quota_fallback_active: Schema.Boolean,
      availability_fallbacks: Schema.Array(Schema.String),
    }),
  ),
})

export const Definition = Rpc.define({
  id: "houshiar.account",
  methods: {
    refresh: {
      input: Schema.toStandardSchemaV1(Schema.Struct({})),
      output: Schema.toStandardSchemaV1(Schema.Boolean),
      errors: { unavailable: Schema.toStandardSchemaV1(Schema.String) },
    },
    usage: {
      input: Schema.toStandardSchemaV1(Schema.Struct({})),
      output: Schema.toStandardSchemaV1(Schema.String),
      errors: { unavailable: Schema.toStandardSchemaV1(Schema.String) },
    },
    fiveHour: {
      input: Schema.toStandardSchemaV1(Schema.Struct({ model: Schema.optional(Schema.String) })),
      output: Schema.toStandardSchemaV1(FiveHourStatus),
      errors: { unavailable: Schema.toStandardSchemaV1(Schema.String) },
    },
  },
  events: {},
})
