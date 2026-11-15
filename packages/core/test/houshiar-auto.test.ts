import { expect } from "bun:test"
import { DateTime, Effect, Layer } from "effect"
import { Agent } from "@opencode/core/agent"
import { ModelResolver } from "@opencode/core/model-resolver"
import { SessionRunnerModel } from "@opencode/core/session/runner/model"
import { Session } from "@opencode/schema/session"
import { Project } from "@opencode/schema/project"
import { Money } from "@opencode/schema/money"
import { AbsolutePath } from "@opencode/schema/schema"
import { OpenAIChat } from "@opencode/ai/protocols"
import { LanguageModel } from "@opencode/ai/effect"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Houshiar } from "@opencode/schema/houshiar"
import { Model } from "@opencode/schema/model"
import { Provider } from "@opencode/schema/provider"
import { it } from "./lib/effect"

it.effect("resolves the gateway Auto model unchanged and preserves conversation protocol", () => {
  const auto = Model.Info.default(Provider.ID.make(Houshiar.id), Model.ID.make(Houshiar.autoModel))
  const packages: string[] = []
  return Effect.gen(function* () {
    const resolver = yield* SessionRunnerModel.Service
    const session = Session.Info.make({
      id: Session.ID.make("ses_auto"),
      projectID: Project.ID.global,
      model: Model.Ref.make({ providerID: auto.providerID, id: auto.id }),
      location: { directory: AbsolutePath.make("/project") },
      cost: Money.USD.make(0),
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      time: { created: DateTime.makeUnsafe(0), updated: DateTime.makeUnsafe(0) },
    })
    expect((yield* resolver.resolve(session, () => Effect.succeed([auto]))).ref.id).toBe(auto.id)
    expect(packages.at(-1)).toBe("@opencode/ai/providers/anthropic-compatible")
    expect(
      (yield* resolver.resolve(
        {
          ...session,
          metadata: { houshiarConversation: { id: "legacy_openai", sessionID: session.id, protocol: "openai" } },
        },
        () => Effect.succeed([auto]),
      )).ref.id,
    ).toBe(auto.id)
    expect(packages.at(-1)).toBe("@opencode/ai/providers/openai-compatible")
    expect((yield* resolver.resolve(session, () => Effect.succeed([])).pipe(Effect.flip))._tag).toBe(
      "SessionRunnerModel.ModelUnavailableError",
    )
  }).pipe(
    Effect.provide(
      LayerNode.compile(SessionRunnerModel.node, {
        replacements: [
          Agent.node.replace(
            Layer.mock(Agent.Service, { select: () => Effect.succeed({ id: Agent.defaultID, info: undefined }) }),
          ),
          ModelResolver.node.replace(
            Layer.mock(ModelResolver.Service, {
              resolveModel: (model) =>
                Effect.sync(() => {
                  packages.push(model.package ?? "")
                  return SessionRunnerModel.resolved(
                    LanguageModel.update(OpenAIChat.route.model({ id: model.id }), { provider: model.providerID }),
                    { capabilities: model.capabilities, cost: model.cost, limit: model.limit },
                  )
                }),
            }),
          ),
        ],
      }),
    ),
  )
})
