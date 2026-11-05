export * as Houshiar from "./houshiar.js"

import { Schema } from "effect"
import { Rpc } from "./rpc.js"

export const id = "houshiar"
export const baseURL = "https://wqai.morvism.ir/v1"

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
  },
  events: {},
})
