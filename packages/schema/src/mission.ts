export * as Mission from "./mission.js"

import { Schema } from "effect"
import { Rpc } from "./rpc.js"
import { optional } from "./schema.js"

export const Status = Schema.Literals(["planning", "active", "paused", "complete", "failed"])
export type Status = typeof Status.Type

export interface Step extends Schema.Schema.Type<typeof Step> {}
export const Step = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  /** The plan text describing what this step must produce. */
  detail: optional(Schema.String),
  status: Schema.Literals(["pending", "in_progress", "done", "failed", "skipped"]),
  /** Evidence recorded when the step finished: test output, command results, or what was built. */
  evidence: optional(Schema.String),
}).annotate({ identifier: "Mission.Step" })

export interface State extends Schema.Schema.Type<typeof State> {}
export const State = Schema.Struct({
  id: Schema.String,
  /** The user's request, verbatim. */
  request: Schema.String,
  status: Status,
  /** Why the mission last changed: the step-runner's reason, or what paused or failed it. */
  reason: optional(Schema.String),
  /** The ordered plan. Empty while planning: the planner has not committed the task breakdown yet. */
  steps: Schema.Array(Step),
  /** Number of continuation rounds spent on the current step, across all steps. */
  rounds: Schema.Number,
  /** A backstop for loops that stall detection misses. */
  maxRounds: Schema.Number,
  /** Rounds in a row without progress: no tool calls, or the same reason as the round before. */
  stalls: optional(Schema.Number),
  /** The server process that armed the mission. */
  boot: Schema.String,
  updatedAt: Schema.Number,
}).annotate({ identifier: "Mission.State" })

/**
 * The `/mission` plugin's RPC. Clients read a Session's mission with `get` and keep it current from `changed`, which
 * the plugin publishes in the Session's Location on every write. A Session's mission is its own: children and forks
 * start without one. The schemas are Standard Schemas too, so Promise clients can call them.
 */
export const Definition = Rpc.define({
  id: "opencode.mission",
  methods: {
    get: {
      input: Schema.toStandardSchemaV1(Schema.Struct({ sessionID: Schema.String })),
      output: Schema.toStandardSchemaV1(Schema.NullOr(State)),
    },
  },
  events: {
    changed: {
      schema: Schema.toStandardSchemaV1(Schema.Struct({ sessionID: Schema.String, mission: Schema.NullOr(State) })),
    },
  },
})
