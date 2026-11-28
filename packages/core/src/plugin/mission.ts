export * as MissionPlugin from "./mission.js"

import { AIError, isRetryable, Message } from "@opencode/ai/effect"
import { UnknownProviderError } from "@opencode/ai/effect"
import { define } from "@opencode/plugin/effect/plugin"
import type { SessionIdleBackground } from "@opencode/plugin/effect/session"
import { Mission } from "@opencode/schema/mission"
import { Session } from "@opencode/schema/session"
import { Cause, Clock, Duration, Effect, FiberMap, Option, Schema, Stream } from "effect"
import CONTINUATION from "./mission/continuation.txt"
import JUDGE from "./mission/judge.txt"
import KICKOFF from "./mission/kickoff.txt"
import REMINDER from "./mission/reminder.txt"
import { MissionTool } from "../tool/plugin/mission-update.js"

export const MAX_REQUEST = 4_000
export const MAX_ROUNDS = 50
export const MAX_STALLS = 3
export const WAIT_LIMIT = Duration.minutes(30)
let processBoot: string | undefined
const boot = () => (processBoot ??= crypto.randomUUID())

type State = Mission.State
const decodeState = Schema.decodeUnknownOption(Mission.State)
const PREFIX = "session:"
const Verdict = Schema.Struct({
  verdict: Schema.Literals(["done", "continue", "blocked", "paused", "wait"]),
  reason: Schema.String,
  next_step: Schema.optionalKey(Schema.String),
})
type Verdict = typeof Verdict.Type
const decodeVerdict = Schema.decodeUnknownOption(Schema.fromJsonString(Verdict))
const USAGE = "Usage: /mission <request> | pause | resume | clear"

export const Plugin = define({
  id: "opencode.mission",
  effect: Effect.fn(function* (ctx) {
    const read = Effect.fn("MissionPlugin.read")(function* (sessionID: string) {
      return Option.getOrUndefined(decodeState(yield* ctx.storage.get(PREFIX + sessionID)))
    })
    const rpc = yield* ctx.rpc.register(Mission.Definition, {
      get: (input) => read(input.sessionID).pipe(Effect.map((mission) => mission ?? null)),
    }).pipe(Effect.orDie)
    const write = Effect.fn("MissionPlugin.write")(function* (sessionID: string, mission: State | undefined) {
      yield* mission ? ctx.storage.set(PREFIX + sessionID, mission) : ctx.storage.remove(PREFIX + sessionID)
      yield* rpc.events.emit("changed", { sessionID, mission: mission ?? null }).pipe(
        Effect.catchCause((cause) => Effect.logWarning("failed to publish mission change", { sessionID, cause })),
      )
    })
    yield* MissionTool.register(ctx, (sessionID, mission) => write(sessionID, mission))
    const replace = Effect.fn("MissionPlugin.replace")(function* (sessionID: Session.ID, expected: State, next: State) {
      const current = yield* read(sessionID)
      if (current?.id !== expected.id || current.updatedAt !== expected.updatedAt || current.status !== expected.status)
        return false
      yield* write(sessionID, next)
      return true
    })
    const settle = Effect.fn("MissionPlugin.settle")(function* (
      sessionID: Session.ID,
      mission: State,
      status: "paused" | "complete" | "failed",
      reason: string,
    ) {
      yield* replace(sessionID, mission, { ...mission, status, reason, updatedAt: yield* Clock.currentTimeMillis })
    })
    const pauseActive = (sessionID: Session.ID, reason: string) =>
      read(sessionID).pipe(Effect.flatMap((mission) => mission?.status === "active" ? settle(sessionID, mission, "paused", reason) : Effect.void))
    const usedTools = Effect.fn("MissionPlugin.usedTools")(function* (sessionID: Session.ID, missionID: string) {
      const messages = yield* ctx.session.context({ sessionID })
      const start = messages.findLastIndex(
        (message) => (message.type === "synthetic" || message.type === "user") && message.metadata?.missionID === missionID,
      )
      return start === -1 || messages.slice(start + 1).some((message) => message.type === "assistant" && message.content.some((part) => part.type === "tool"))
    })
    const planText = (mission: State) => mission.steps.length === 0
      ? "No plan exists yet. Start by calling mission_update with a concrete ordered plan."
      : ["Current mission plan:", ...mission.steps.map((step, index) => `${index + 1}. [${step.status}] ${step.title}${step.detail ? ` — ${step.detail}` : ""}${step.evidence ? ` Evidence: ${step.evidence}` : ""}`)].join("\n")
    const judge = Effect.fn("MissionPlugin.judge")(function* (sessionID: Session.ID, mission: State, background: ReadonlyArray<SessionIdleBackground>) {
      const prompt = render(JUDGE, {
        request: escape(mission.request),
        plan: escape(planText(mission)),
        background: background.length === 0 ? "No background work is running." : `Background work still running: ${background.length}`,
      })
      let retries = 0
      while (true) {
        const result = yield* Effect.result(
          ctx.session.generate({ sessionID, prompt }).pipe(
            Effect.map((response) => Option.getOrUndefined(decodeVerdict(response.text))),
          ),
        )
        if (result._tag === "Success") return result.success
        const failure = result.failure instanceof AIError ? result.failure : new AIError({ reason: new UnknownProviderError({ message: String(result.failure) }) })
        if (!isRetryable(failure) || retries >= 10) return yield* Effect.fail(failure)
        retries++
        yield* Effect.sleep(Duration.minutes(2))
      }
    })
    const idle = Effect.fn("MissionPlugin.idle")(function* (sessionID: Session.ID, background: ReadonlyArray<SessionIdleBackground>) {
      const mission = yield* read(sessionID)
      if (mission?.status !== "active") return
      if (mission.boot !== boot()) return yield* settle(sessionID, mission, "paused", "The server restarted while the mission was active")
      if (background.some((work) => (work.kind === "subagent" || work.kind === "image") && work.sessionID === sessionID)) return
      if (mission.rounds >= mission.maxRounds) return yield* settle(sessionID, mission, "failed", `Reached the limit of ${mission.maxRounds} rounds`)
      const verdict = yield* judge(sessionID, mission, background)
      if (!verdict) return yield* settle(sessionID, mission, "failed", "Mission reviewer returned no valid result")
      if (verdict.verdict === "wait") return
      if (verdict.verdict === "done") return yield* settle(sessionID, mission, "complete", verdict.reason)
      if (verdict.verdict === "blocked" || verdict.verdict === "paused") return yield* settle(sessionID, mission, "paused", verdict.reason)
      const stalled = mission.reason === verdict.reason || !(yield* usedTools(sessionID, mission.id))
      const stalls = stalled ? (mission.stalls ?? 0) + 1 : 0
      if (stalls >= MAX_STALLS) return yield* settle(sessionID, mission, "failed", `Not making progress: ${verdict.reason}`)
      const next = { ...mission, rounds: mission.rounds + 1, stalls, reason: verdict.reason, updatedAt: yield* Clock.currentTimeMillis }
      if (!(yield* replace(sessionID, mission, next))) return
      yield* ctx.session.synthetic({ sessionID, text: render(CONTINUATION, { request: escape(next.request), feedback: [verdict.reason, verdict.next_step && `Next step: ${verdict.next_step}`].filter(Boolean).join("\n") }), metadata: { source: "mission", missionID: next.id } })
    })
    const timers = yield* FiberMap.make<string>()
    const watch = (sessionID: Session.ID) =>
      read(sessionID).pipe(
        Effect.flatMap((mission) =>
          mission?.status === "active"
            ? FiberMap.run(
                timers,
                sessionID,
                Effect.sleep(WAIT_LIMIT).pipe(
                  Effect.andThen(settle(sessionID, mission, "failed", "Mission waited too long for background work")),
                  Effect.catchCause(() => Effect.void),
                ),
              )
            : Effect.void,
        ),
      )
    const touch = Effect.fn("MissionPlugin.touch")(function* (sessionID: Session.ID) {
      if ((yield* FiberMap.size(timers)) === 0) return
      let current = (yield* ctx.session.get({ sessionID })).parentID
      while (current !== undefined) {
        if (yield* FiberMap.has(timers, current)) return yield* watch(current)
        current = (yield* ctx.session.get({ sessionID: current })).parentID
      }
    })
    yield* ctx.session.hook("experimental.idle", (event) =>
      idle(event.sessionID, event.background).pipe(
        Effect.catchCause((cause) =>
          Cause.hasInterruptsOnly(cause)
            ? Effect.interrupt
            : Effect.logWarning("mission continuation failed", { sessionID: event.sessionID, cause }).pipe(
                Effect.andThen(pauseActive(event.sessionID, "The mission stopped after an error")),
                Effect.catchCause(() => Effect.void),
              ),
        ),
      ),
    )
    yield* ctx.session.hook("context", (event) =>
      read(event.sessionID).pipe(
        Effect.map((mission) => {
          if (mission?.status !== "active") return
          const request = `<untrusted_request>\n${escape(mission.request)}\n</untrusted_request>`
          if (!event.messages.some((message) => message.role === "user" && textOf(message).includes(request)))
            event.messages.splice(event.messages.at(-1)?.role === "user" ? event.messages.length - 1 : event.messages.length, 0, Message.user(render(REMINDER, { request: escape(mission.request) })))
        }),
        Effect.catchCause((cause) => Effect.logWarning("failed to remind the model of the mission", { sessionID: event.sessionID, cause })),
      ),
    )
    yield* ctx.event
      .subscribe({ types: ["session.execution.started", "session.execution.succeeded", "session.execution.interrupted", "session.execution.failed", "session.step.started", "session.step.ended", "session.deleted"] })
      .pipe(
        Stream.runForEach((event) => {
          const sessionID = event.data.sessionID
          if (event.type === "session.deleted") return FiberMap.remove(timers, sessionID).pipe(Effect.andThen(ctx.storage.remove(PREFIX + sessionID)))
          if (event.type === "session.step.started" || event.type === "session.step.ended") return touch(sessionID)
          if (event.type === "session.execution.started") return FiberMap.remove(timers, sessionID)
          if (event.type === "session.execution.succeeded") return watch(sessionID)
          if (event.type === "session.execution.interrupted" && event.data.reason !== "user") return Effect.void
          return pauseActive(sessionID, event.type === "session.execution.failed" ? `The session failed: ${event.data.error.message}` : "Stopped by the user")
        }),
        Effect.forkScoped({ startImmediately: true }),
      )
    yield* ctx.command.transform((editor) => editor.add({
      name: "mission",
      description: "run a request through a verified multi-step plan until completion",
      execute: (input) => Effect.gen(function* () {
        const text = input.prompt.text.trim()
        const current = yield* read(input.sessionID)
        if (text.toLowerCase() === "pause") return yield* current ? write(input.sessionID, { ...current, status: "paused", reason: "Paused by the user", updatedAt: yield* Clock.currentTimeMillis }) : Effect.fail(new Error("No active mission."))
        if (text.toLowerCase() === "resume") return yield* current?.status === "paused" ? write(input.sessionID, { ...current, status: "active", boot: boot(), rounds: 0, updatedAt: yield* Clock.currentTimeMillis }) : Effect.fail(new Error("No paused mission."))
        if (text.toLowerCase() === "clear") return yield* current ? write(input.sessionID, undefined) : Effect.fail(new Error("No mission is set."))
        if (!text) return yield* Effect.fail(new Error(current ? `${current.request}\n${USAGE}` : USAGE))
        if (text.length > MAX_REQUEST) return yield* Effect.fail(new Error(`A mission request is limited to ${MAX_REQUEST} characters.`))
        const created: State = { id: crypto.randomUUID(), request: text, status: "active", steps: [], rounds: 0, maxRounds: MAX_ROUNDS, boot: boot(), updatedAt: yield* Clock.currentTimeMillis }
        yield* write(input.sessionID, created)
        yield* ctx.session.synthetic({ sessionID: input.sessionID, text: render(KICKOFF, { request: escape(text) }), description: `Mission: ${truncate(text, 120)}`, metadata: { source: "mission", missionID: created.id }, delivery: input.delivery })
      }).pipe(Effect.asVoid),
    }))
  }),
})

function render(template: string, values: Record<string, string>) { return template.replace(/\$\{(\w+)\}/g, (match, key: string) => values[key] ?? match) }
function textOf(message: Message) { return message.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n") }
function truncate(text: string, length: number) { const line = text.replace(/\s+/g, " "); return line.length > length ? `${line.slice(0, length - 1)}…` : line }
function escape(text: string) { return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;") }
