export * as SessionRunnerModel from "./model.js"

import { makeLocationNode } from "@opencode/util/effect/app-node"
import { httpClient } from "@opencode/util/effect/app-node-platform"
import { Houshiar } from "@opencode/schema/houshiar"
import { LanguageModel } from "@opencode/ai/effect"
import { Model } from "@opencode/schema/model"
import { Provider } from "@opencode/schema/provider"
import { Context, Effect, Layer, Schema } from "effect"
import { HttpClient } from "effect/http"
import { HoushiarAuto } from "../../houshiar-auto.js"
import { HoushiarMemory } from "../../houshiar-memory.js"
import { Agent } from "../../agent.js"
import { Integration } from "../../integration.js"
import { ModelResolver } from "../../model-resolver.js"
import { SessionSchema } from "../schema.js"

export class ModelNotSelectedError extends Schema.TaggedError<ModelNotSelectedError>()(
  "SessionRunnerModel.ModelNotSelectedError",
  { sessionID: SessionSchema.ID },
) {
  override get message() {
    return `No model is available for session ${this.sessionID}`
  }
}

export class ModelUnavailableError extends Schema.TaggedError<ModelUnavailableError>()(
  "SessionRunnerModel.ModelUnavailableError",
  { providerID: Provider.ID, modelID: Model.ID },
) {
  override get message() {
    if (this.providerID === "azure-cognitive-services")
      return `Model unavailable: ${this.providerID}/${this.modelID}. This provider has been deprecated; use azure/${this.modelID} instead.`
    if (this.providerID === "google-vertex-anthropic")
      return `Model unavailable: ${this.providerID}/${this.modelID}. This provider has been deprecated; use google-vertex/${this.modelID} instead.`
    return `Model unavailable: ${this.providerID}/${this.modelID}`
  }
}
export type Error = ModelNotSelectedError | ModelUnavailableError | ModelResolver.Error
export type Resolved = ModelResolver.Resolved

export interface Interface {
  /** Availability is sampled lazily for each explicitly selected model resolution. */
  readonly resolve: (
    session: SessionSchema.Info,
    available: () => Effect.Effect<ReadonlyArray<Model.Info>>,
    prompt?: { readonly id: string; readonly text: string },
  ) => Effect.Effect<Resolved, Error>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/SessionRunnerModel") {}

/** Builds a Resolved whose catalog identity mirrors the route model. Test or embedding seam. */
export const resolved = (
  model: LanguageModel,
  options: {
    readonly capabilities: Model.Capabilities
    readonly variant?: Model.VariantID
    readonly cost: Model.Info["cost"]
    readonly limit: Model.Info["limit"]
    readonly compaction?: Provider.Compaction
    readonly transport?: Provider.Transport
  },
): Resolved => ({
  model,
  ref: Model.Ref.make({
    id: Model.ID.make(model.id),
    providerID: Provider.ID.make(model.provider),
    ...(options.variant === undefined ? {} : { variant: options.variant }),
  }),
  capabilities: options.capabilities,
  cost: options.cost,
  limit: options.limit,
  compaction: options.compaction,
  transport: options.transport,
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const resolver = yield* ModelResolver.Service
    const agents = yield* Agent.Service
    const http = yield* HttpClient.HttpClient
    const integrations = yield* Integration.Service
    const selections = new Map<string, { prompt: string; model: Model.Info }>()
    return Service.of({
      resolve: Effect.fn("SessionRunnerModel.resolve")(function* (session, available, prompt) {
        const conversation = HoushiarMemory.binding(session)
        const select = (model: Model.Info, variant?: Model.VariantID) =>
          resolver.resolveModel(
            model.providerID === Houshiar.id
              ? {
                  ...model,
                  // A saved conversation keeps its protocol even when its model changes.
                  package:
                    conversation?.protocol === "openai"
                      ? "@opencode/ai/providers/openai-compatible"
                      : "@opencode/ai/providers/anthropic-compatible",
                }
              : model,
            variant,
          )
        // Location plugins populate and filter the catalog asynchronously during layer startup.
        const requested =
          session.model ??
          (yield* Effect.gen(function* () {
            const agent = (yield* agents.select(session.agent)).info?.model
            const preferred =
              agent &&
              (yield* available()).find((model) => model.providerID === agent.providerID && model.id === agent.id)
            const resolved = preferred ? yield* select(preferred, agent.variant) : yield* resolver.resolve()
            if (resolved) return resolved.ref
            return yield* new ModelNotSelectedError({ sessionID: session.id })
          }))
        if (requested.providerID === Houshiar.id && requested.id === Houshiar.autoModel) {
          const candidates = (yield* available()).filter(
            (model) => model.providerID === Houshiar.id && model.id !== Houshiar.autoModel,
          )
          const fallback = candidates.find((model) => model.id === Houshiar.fallbackModel)
          if (!fallback)
            return yield* new ModelUnavailableError({
              providerID: requested.providerID,
              modelID: Model.ID.make(Houshiar.fallbackModel),
            })
          const cached = selections.get(session.id)
          const selected =
            cached &&
            (!prompt || cached.prompt === prompt.id) &&
            candidates.find((model) => model.id === cached.model.id)
          if (selected) return yield* select(selected)
          const routed = prompt
            ? yield* Effect.gen(function* () {
                const connection = yield* integrations.connection.active(Integration.ID.make(Houshiar.id))
                const credential = connection ? yield* integrations.connection.resolve(connection) : undefined
                if (credential?.type !== "key") return
                return yield* HoushiarAuto.select(http, credential.key, candidates, prompt.text)
              }).pipe(Effect.orElseSucceed(() => undefined))
            : undefined
          const model = routed ?? fallback
          if (prompt) selections.set(session.id, { prompt: prompt.id, model })
          return yield* select(model)
        }
        const selected = (yield* available()).find(
          (model) => model.providerID === requested.providerID && model.id === requested.id,
        )
        if (!selected)
          return yield* new ModelUnavailableError({
            providerID: requested.providerID,
            modelID: requested.id,
          })
        return yield* select(selected, requested.variant)
      }),
    })
  }),
)

export const node = makeLocationNode({
  service: Service,
  layer,
  deps: [ModelResolver.node, Agent.node, Integration.node, httpClient],
})
