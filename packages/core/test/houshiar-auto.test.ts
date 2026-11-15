import { expect } from "bun:test"
import { DateTime, Effect, Layer } from "effect"
import { Agent } from "@opencode/core/agent"
import { Credential } from "@opencode/core/credential"
import { Integration } from "@opencode/core/integration"
import { ModelResolver } from "@opencode/core/model-resolver"
import { SessionRunnerModel } from "@opencode/core/session/runner/model"
import { Session } from "@opencode/schema/session"
import { Project } from "@opencode/schema/project"
import { Money } from "@opencode/schema/money"
import { AbsolutePath } from "@opencode/schema/schema"
import { OpenAIChat } from "@opencode/ai/protocols"
import { LanguageModel } from "@opencode/ai/effect"
import { httpClient } from "@opencode/util/effect/app-node-platform"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { HttpClient, HttpClientResponse } from "effect/http"
import { HoushiarAuto } from "@opencode/core/houshiar-auto"
import { Houshiar } from "@opencode/schema/houshiar"
import { Model } from "@opencode/schema/model"
import { Provider } from "@opencode/schema/provider"
import { it } from "./lib/effect"
import { withEnv } from "./fixture/env"

const models = ["coding-model", Houshiar.fallbackModel].map((id) =>
  Model.Info.default(Provider.ID.make(Houshiar.id), Model.ID.make(id)),
)

it.effect("keeps Auto selection per prompt and falls back when the router fails", () =>
  withEnv({ HOUSHIAR_AUTO_API_KEY: "unused-env-key" }, () => {
    const credentials = [Credential.Key.make({ type: "key", key: "user-key" })]
    const unused = () => Effect.die("unused connection operation")
    const requests: string[] = []
    const packages: string[] = []
    const http = HttpClient.make((request) => {
      requests.push(request.url)
      expect(request.headers.authorization).toBe(requests.length === 1 ? "Bearer user-key" : "Bearer changed-user-key")
      return Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          requests.length === 1
            ? Response.json({ answers: { model_0: { type: "noul", noul: 0.9 }, model_1: { type: "noul", noul: 0.4 } } })
            : new Response("unavailable", { status: 503 }),
        ),
      )
    })
    return Effect.gen(function* () {
      const resolver = yield* SessionRunnerModel.Service
      const session = Session.Info.make({
        id: Session.ID.make("ses_auto"),
        projectID: Project.ID.global,
        model: Model.Ref.make({ providerID: Provider.ID.make(Houshiar.id), id: Model.ID.make(Houshiar.autoModel) }),
        location: { directory: AbsolutePath.make("/project") },
        cost: Money.USD.make(0),
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        time: { created: DateTime.makeUnsafe(0), updated: DateTime.makeUnsafe(0) },
      })
      const available = () => Effect.succeed(models)
      const prompt = { id: "first", text: "Fix code" }
      expect((yield* resolver.resolve(session, available, prompt)).ref.id).toBe(models[0]!.id)
      expect((yield* resolver.resolve(session, available, prompt)).ref.id).toBe(models[0]!.id)
      expect((yield* resolver.resolve(session, available)).ref.id).toBe(models[0]!.id)
      expect((yield* resolver.resolve({ ...session, model: undefined }, available, prompt)).ref.id).toBe(models[0]!.id)
      expect(requests).toHaveLength(1)
      credentials[0] = Credential.Key.make({ type: "key", key: "changed-user-key" })
      expect((yield* resolver.resolve(session, available, { id: "second", text: "Next task" })).ref.id).toBe(
        models[1]!.id,
      )
      expect(requests).toHaveLength(2)
      expect(packages.every((value) => value === "@opencode/ai/providers/anthropic-compatible")).toBe(true)
      yield* resolver.resolve(
        {
          ...session,
          model: Model.Ref.make({ providerID: models[0]!.providerID, id: models[0]!.id }),
          metadata: { houshiarConversation: { id: "legacy_openai", sessionID: session.id, protocol: "openai" } },
        },
        available,
        prompt,
      )
      expect(packages.at(-1)).toBe("@opencode/ai/providers/openai-compatible")
      credentials.splice(0)
      expect((yield* resolver.resolve(session, available, { id: "third", text: "Another task" })).ref.id).toBe(
        models[1]!.id,
      )
      expect(requests).toHaveLength(2)
      expect(
        (yield* resolver.resolve(session, () => Effect.succeed([models[0]!]), { id: "missing-fallback", text: "task" }))
          .ref.id,
      ).toBe(models[0]!.id)
      expect((yield* resolver.resolve(session, () => Effect.succeed([]), prompt).pipe(Effect.flip))._tag).toBe(
        "SessionRunnerModel.ModelUnavailableError",
      )
      expect(
        (yield* resolver.resolve(
          { ...session, model: Model.Ref.make({ providerID: models[0]!.providerID, id: models[0]!.id }) },
          available,
          prompt,
        )).ref.id,
      ).toBe(models[0]!.id)
      expect(requests).toHaveLength(2)
    }).pipe(
      Effect.provide(
        LayerNode.compile(SessionRunnerModel.node, {
          replacements: [
            Agent.node.replace(
              Layer.mock(Agent.Service, {
                select: () => Effect.succeed({ id: Agent.defaultID, info: undefined }),
              }),
            ),
            ModelResolver.node.replace(
              Layer.mock(ModelResolver.Service, {
                resolve: () =>
                  Effect.succeed(
                    SessionRunnerModel.resolved(
                      LanguageModel.update(OpenAIChat.route.model({ id: Houshiar.autoModel }), {
                        provider: Houshiar.id,
                      }),
                      { capabilities: models[1]!.capabilities, cost: models[1]!.cost, limit: models[1]!.limit },
                    ),
                  ),
                resolveModel: (model) =>
                  Effect.sync(() => {
                    packages.push(model.package ?? "")
                    return SessionRunnerModel.resolved(
                      LanguageModel.update(OpenAIChat.route.model({ id: model.id }), { provider: model.providerID }),
                      {
                        capabilities: model.capabilities,
                        cost: model.cost,
                        limit: model.limit,
                      },
                    )
                  }),
              }),
            ),
            Integration.node.replace(
              Layer.mock(Integration.Service, {
                revision: () => 0,
                oauth: { connect: unused, status: unused, complete: unused, cancel: unused },
                command: { connect: unused, status: unused, cancel: unused },
                connection: {
                  active: (id) => {
                    expect(id).toBe(Integration.ID.make(Houshiar.id))
                    return Effect.succeed(
                      credentials[0]
                        ? {
                            type: "credential" as const,
                            id: Credential.ID.make("user-key"),
                            label: "Houshiar",
                            method: "key" as const,
                          }
                        : undefined,
                    )
                  },
                  resolve: () => Effect.succeed(credentials[0]),
                  key: unused,
                  external: unused,
                  activate: unused,
                  update: unused,
                  remove: unused,
                  status: unused,
                },
              }),
            ),
            httpClient.replace(Layer.succeed(HttpClient.HttpClient, http)),
          ],
        }),
      ),
    )
  }),
)

it.effect("selects the available model with the highest Jev score", () =>
  Effect.gen(function* () {
    const http = HttpClient.make((request) => {
      expect(request.url).toBe("https://9router.morvism.ir/v1/systemone")
      expect(request.method).toBe("POST")
      expect(request.headers.authorization).toBe("Bearer router-key")
      expect(request.body._tag).toBe("Uint8Array")
      if (request.body._tag === "Uint8Array") {
        const body = JSON.parse(new TextDecoder().decode(request.body.body))
        expect(body.model).toBe("openrouter/typesafe/jev-1.13")
        expect(body.state).toBe("Fix this compiler error")
        expect(Object.keys(body.questions)).toEqual(["model_0", "model_1"])
        expect(body.questions.model_0.instructions).toContain("coding-model")
        expect(body.questions.model_1.instructions).toContain(Houshiar.fallbackModel)
      }
      return Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          Response.json({
            answers: {
              model_0: { type: "noul", noul: 0.95 },
              model_1: { type: "noul", noul: 0.5 },
            },
          }),
        ),
      )
    })
    expect((yield* HoushiarAuto.select(http, "router-key", models, "Fix this compiler error"))?.id).toBe(
      Model.ID.make("coding-model"),
    )
  }),
)

it.effect("declines incomplete, zero and malformed scores", () =>
  Effect.gen(function* () {
    yield* Effect.forEach(
      [
        { model_0: { type: "noul", noul: 0.9 } },
        { model_0: { type: "noul", noul: 0 }, model_1: { type: "noul", noul: 0 } },
        { model_0: { type: "noul", noul: 2 }, model_1: { type: "noul", noul: 0.5 } },
        { unknown: { type: "noul", noul: 1 } },
      ],
      (answers) =>
        Effect.gen(function* () {
          const http = HttpClient.make((request) =>
            Effect.succeed(HttpClientResponse.fromWeb(request, Response.json({ answers }))),
          )
          expect(
            yield* HoushiarAuto.select(http, "router-key", models, "task").pipe(Effect.orElseSucceed(() => undefined)),
          ).toBeUndefined()
        }),
    )
  }),
)

it.effect("skips remote requests when credentials or task data are absent", () =>
  Effect.gen(function* () {
    const http = HttpClient.make(() => Effect.die("unexpected remote request"))
    expect(yield* HoushiarAuto.select(http, "", models, "task")).toBeUndefined()
    expect(yield* HoushiarAuto.select(http, "router-key", models, " ")).toBeUndefined()
    expect(yield* HoushiarAuto.select(http, "router-key", [], "task")).toBeUndefined()
  }),
)
