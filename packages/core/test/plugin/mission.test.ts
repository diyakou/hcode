import { describe, expect } from "bun:test"
import { Effect, Layer, Schema } from "effect"
import { LanguageModel, type LLMRequest } from "@opencode/ai/effect"
import { OpenAIChat } from "@opencode/ai/protocols/openai-chat"
import { TestLLM } from "@opencode/ai/testing"
import { Agent } from "@opencode/core/agent"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { LayerNodePlatform } from "@opencode/core/effect/app-node-platform"
import { Watcher } from "@opencode/core/filesystem/watcher"
import { Job } from "@opencode/core/job"
import { KV } from "@opencode/core/kv"
import { LocationServiceMap } from "@opencode/core/location-service-map"
import { MissionPlugin } from "@opencode/core/plugin/mission"
import { PluginHost } from "@opencode/core/plugin/host"
import { Model } from "@opencode/core/model"
import { Provider } from "@opencode/core/provider"
import { Rpc } from "@opencode/core/rpc"
import { AbsolutePath } from "@opencode/core/schema"
import { Session } from "@opencode/core/session"
import { SessionRunnerModel } from "@opencode/core/session/runner/model"
import { Mission } from "@opencode/schema/mission"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import { offlineModels } from "../fixture/models"
import { tempGlobalLayer } from "../fixture/global"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"

const llmLayer = TestLLM.testLayer({ fallback: TestLLM.text("Checked.", "work") })
const it = testEffect(
  Layer.merge(
    llmLayer,
    AppNodeBuilder.build(LayerNode.group([Session.node, LocationServiceMap.node, Job.node, KV.node]), [
      Global.node.replace(tempGlobalLayer),
      offlineModels,
      Watcher.node.replace(Watcher.configured({ enabled: false })),
      LayerNodePlatform.llmClient.replace(llmLayer),
      SessionRunnerModel.node.replace(
        Layer.succeed(SessionRunnerModel.Service, {
          resolve: () =>
            Effect.succeed(
              SessionRunnerModel.resolved(
                LanguageModel.make({ id: "mission", provider: "test", route: OpenAIChat.route }),
                {
                  capabilities: { tools: true, input: ["text"], output: ["text"] },
                  cost: [],
                  limit: { context: 200_000, output: 32_000 },
                },
              ),
            ),
        }),
      ),
    ]),
  ),
)
const model = Model.Ref.make({ id: Model.ID.make("mission"), providerID: Provider.ID.make("test") })
const first: Mission.Step = { id: "one", title: "Check parser", detail: "Run parser checks", status: "in_progress" }
const finished: Mission.Step = { ...first, status: "done", evidence: "Parser checks: 12 passed" }
const storage = KV.Service.use((kv) => Effect.succeed(PluginHost.storage(kv, MissionPlugin.Plugin.id)))
const read = (id: Session.ID) => storage.pipe(Effect.flatMap((kv) => kv.get(`session:${id}`)))
const mission = (id: Session.ID) => read(id).pipe(Effect.map(Schema.decodeUnknownSync(Mission.State)))
const isReview = (request: LLMRequest) =>
  JSON.stringify(request.messages.at(-1)).includes("reviewer for the session's mission")
function script(plans: unknown[][], verdicts: string[]) {
  const updates = [...plans]
  const reviews = [...verdicts]
  const asked: LLMRequest[] = []
  return TestLLM.Test.use((llm) =>
    llm.serve((request) => {
      if (isReview(request)) {
        asked.push(request)
        return TestLLM.text(
          JSON.stringify({ verdict: reviews.shift() ?? "paused", reason: "Parser checks: 12 passed" }),
          `review-${asked.length}`,
        )
      }
      if (!request.tools.some((tool) => tool.name === "mission_update")) return TestLLM.text("Mission", "title")
      const steps = updates.shift()
      return steps
        ? TestLLM.toolCall(`plan-${updates.length}`, "mission_update", { steps })
        : TestLLM.text("Parser checks: 12 passed", "work")
    }),
  ).pipe(Effect.as(asked))
}
function project(agent = "build") {
  return Effect.gen(function* () {
    const tmp = yield* tmpdirScoped()
    const sessions = yield* Session.Service
    return yield* sessions.create({
      location: { directory: AbsolutePath.make(tmp.path) },
      title: "Mission",
      agent: Agent.ID.make(agent),
      model,
    })
  })
}

describe("mission plugin", () => {
  it.live("activates ordinary root build prompts before first runner request and tool snapshot", () =>
    Effect.gen(function* () {
      const session = yield* project()
      const sessions = yield* Session.Service
      const llm = yield* TestLLM.Test
      yield* script([[first], [finished]], ["complete"])
      yield* sessions.prompt({ sessionID: session.id, text: "Fix parser", resume: false })
      expect(yield* mission(session.id)).toMatchObject({ request: "Fix parser", status: "active", steps: [] })
      expect(yield* llm.requests()).toHaveLength(0)
      yield* sessions.resume(session.id)
      const primary = (yield* llm.requests()).find((request) =>
        request.tools.some((tool) => tool.name === "mission_update"),
      )
      expect(primary).toBeDefined()
      expect(
        primary?.messages
          .flatMap((message) => message.content.flatMap((part) => (part.type === "text" ? [part.text] : [])))
          .join("\n"),
      ).toContain("<untrusted_request>\nFix parser\n</untrusted_request>")
      expect(yield* mission(session.id)).toMatchObject({ status: "complete", steps: [finished] })
    }),
  )

  it.live("/mission and real mission_update share storage and RPC, deriving omitted titles from full detail", () =>
    Effect.gen(function* () {
      const session = yield* project()
      const sessions = yield* Session.Service
      const detail = "Run parser integration checks\nRetain every line of this detail."
      yield* script([[{ id: "one", detail, status: "in_progress" }]], ["paused"])
      yield* sessions.command({ sessionID: session.id, command: "mission", text: "Fix parser" })
      yield* sessions.wait(session.id)
      const saved = yield* mission(session.id)
      expect(saved.steps).toHaveLength(1)
      expect(saved.steps[0]).toEqual({
        id: "one",
        title: "Run parser integration checks",
        detail,
        status: "in_progress",
      })
      const locations = yield* LocationServiceMap.Service
      const remote = yield* Rpc.Service.use((rpc) =>
        rpc.client(Mission.Definition).get({ sessionID: session.id }),
      ).pipe(Effect.provide(locations.get(session.location)))
      expect(remote).toEqual(saved)
    }),
  )

  it.live("done advances only current step and continues execution", () =>
    Effect.gen(function* () {
      const session = yield* project()
      const sessions = yield* Session.Service
      const reviews = yield* script(
        [[first, { id: "two", title: "Check build", status: "pending" }]],
        ["done", "paused"],
      )
      yield* sessions.command({ sessionID: session.id, command: "mission", text: "Fix parser and build" })
      yield* sessions.wait(session.id)
      expect(reviews).toHaveLength(2)
      expect(yield* mission(session.id)).toMatchObject({
        status: "paused",
        steps: [
          { id: "one", status: "done", evidence: "Parser checks: 12 passed" },
          { id: "two", status: "in_progress" },
        ],
      })
    }),
  )

  for (const scenario of [
    { name: "no plan", steps: [] },
    { name: "pending step", steps: [{ ...first, status: "pending" as const }] },
    { name: "failed step", steps: [{ ...finished, status: "failed" as const }] },
    { name: "missing evidence", steps: [{ ...first, status: "done" as const }] },
    { name: "blank evidence", steps: [{ ...finished, evidence: " " }] },
  ])
    it.live(`complete cannot finish mission with ${scenario.name}`, () =>
      Effect.gen(function* () {
        const session = yield* project()
        const sessions = yield* Session.Service
        const llm = yield* TestLLM.Test
        const gate = yield* llm.gate()
        const reviews = yield* script([], ["complete", "paused"])
        yield* sessions.command({ sessionID: session.id, command: "mission", text: "Fix parser" })
        yield* gate.started
        const current = yield* mission(session.id)
        const kv = yield* storage
        yield* kv.set(`session:${session.id}`, { ...current, steps: scenario.steps })
        yield* gate.release
        yield* sessions.wait(session.id)
        expect(reviews).toHaveLength(2)
        expect(yield* mission(session.id)).toMatchObject({ status: "paused" })
      }),
    )

  it.live("pause and resume preserve mission and wake work with synthetic continuation", () =>
    Effect.gen(function* () {
      const session = yield* project()
      const sessions = yield* Session.Service
      const llm = yield* TestLLM.Test
      const gate = yield* llm.gate()
      yield* sessions.command({ sessionID: session.id, command: "mission", text: "Fix parser" })
      yield* gate.started
      const before = yield* mission(session.id)
      yield* sessions.command({ sessionID: session.id, command: "mission", text: "pause" })
      yield* gate.release
      yield* sessions.wait(session.id)
      expect(yield* mission(session.id)).toMatchObject({ id: before.id, status: "paused" })
      const reviews = yield* script([[first], [finished]], ["complete"])
      yield* sessions.command({ sessionID: session.id, command: "mission", text: "resume" })
      yield* sessions.wait(session.id)
      expect(reviews).toHaveLength(1)
      expect(yield* mission(session.id)).toMatchObject({ id: before.id, status: "complete", steps: [finished] })
      const notices = (yield* sessions.messages({ sessionID: session.id, order: "asc" })).filter(
        (message) => message.type === "synthetic",
      )
      expect(notices).toMatchObject([{ metadata: { source: "mission" } }, { metadata: { source: "mission" } }])
    }),
  )

  for (const kind of ["child", "plan", "subagent", "synthetic"] as const)
    it.live(`does not auto activate for ${kind} input`, () =>
      Effect.gen(function* () {
        const root = yield* project(kind === "plan" ? "plan" : kind === "subagent" ? "explore" : "build")
        const sessions = yield* Session.Service
        const session =
          kind === "child"
            ? yield* sessions.create({ parentID: root.id, title: "Helper", agent: Agent.ID.make("build"), model })
            : root
        if (kind === "synthetic")
          yield* sessions.synthetic({ sessionID: session.id, text: "Background finished", resume: false })
        if (kind !== "synthetic") yield* sessions.prompt({ sessionID: session.id, text: "Fix parser", resume: false })
        expect(yield* read(session.id)).toBeUndefined()
      }),
    )
})
