export * as MissionTool from "./mission-update.js"

import { ToolFailure } from "@opencode/ai/effect"
import type { Context } from "@opencode/plugin/effect/plugin"
import { Clock, Effect, Schema } from "effect"
import { Mission } from "@opencode/schema/mission"
import { Permission } from "../../permission.js"
import DESCRIPTION from "../mission-update.txt"

export const name = "mission_update"

export const Input = Schema.Struct({
  steps: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      title: Schema.optionalKey(Schema.String).annotate({
        description: "Short step title. When omitted, detail supplies the title.",
      }),
      detail: Schema.optionalKey(Schema.String),
      status: Mission.Step.fields.status,
      evidence: Schema.optionalKey(Schema.String),
    }),
  ).annotate({
    description: "The updated step plan. Send the full list; it replaces the previous one.",
  }),
})
export type Input = typeof Input.Type

export const Output = Schema.Struct({
  steps: Schema.Array(Mission.Step),
})
export type Output = typeof Output.Type

export const summarize = (steps: ReadonlyArray<Mission.Step>) => {
  if (steps.length === 0) return "Mission plan cleared"
  const count = (status: Mission.Step["status"]) => steps.filter((step) => step.status === status).length
  const counts = [
    `${count("done")}/${steps.length} done`,
    ...(["in_progress", "pending", "failed", "skipped"] as const).flatMap((status) =>
      count(status) ? [`${count(status)} ${status.replace("_", " ")}`] : [],
    ),
  ].join(", ")
  const active = steps.filter((step) => step.status === "in_progress").map((step) => JSON.stringify(step.title))
  return `Mission plan updated: ${counts}${active.length ? `. In progress: ${active.join(", ")}` : ""}`
}

export const register = Effect.fn("MissionTool.register")(function* (
  ctx: Context,
  write: (sessionID: string, mission: Mission.State) => Effect.Effect<void>,
) {
  const permission = yield* Permission.Service
  yield* ctx.tool
    .transform((editor) =>
      editor.add({
        name,
        options: { codemode: false },
        description: DESCRIPTION,
        input: Input,
        output: Output,
        execute: (input, context) =>
          Effect.gen(function* () {
            const steps = input.steps.map((step) => ({
              ...step,
              title:
                step.title?.trim() ||
                step.detail
                  ?.trim()
                  .split(/[\r\n]/)[0]
                  ?.slice(0, 120) ||
                "",
            }))
            if (steps.some((step) => !step.id.trim() || !step.title))
              return yield* new ToolFailure({ message: "Each mission step needs an id and a title or detail." })
            if (new Set(steps.map((step) => step.id)).size !== steps.length)
              return yield* new ToolFailure({ message: "Mission step IDs must be unique." })
            if (steps.filter((step) => step.status === "in_progress").length > 1)
              return yield* new ToolFailure({ message: "Only one mission step can be in progress." })
            if (steps.some((step) => (step.status === "done" || step.status === "failed") && !step.evidence?.trim()))
              return yield* new ToolFailure({ message: "Done and failed mission steps require evidence." })
            yield* permission
              .assert({
                action: name,
                resources: ["*"],
                save: ["*"],
                sessionID: context.sessionID,
                agent: context.agent,
                source: { type: "tool", messageID: context.messageID, id: context.id },
              })
              .pipe(
                Effect.mapError((error) => new ToolFailure({ message: "Unable to update the mission plan", error })),
                Effect.andThen(
                  ctx.storage.get(`session:${context.sessionID}`).pipe(
                    Effect.flatMap((stored) => {
                      const mission =
                        stored === undefined ? undefined : Schema.decodeUnknownOption(Mission.State)(stored)
                      if (mission === undefined || mission._tag === "None" || mission.value.status !== "active")
                        return new ToolFailure({ message: "No mission is active in this session." })
                      return Clock.currentTimeMillis.pipe(
                        Effect.flatMap((updatedAt) =>
                          write(context.sessionID, {
                            ...mission.value,
                            steps,
                            updatedAt,
                          }),
                        ),
                      )
                    }),
                    Effect.mapError((error) =>
                      error instanceof ToolFailure
                        ? error
                        : new ToolFailure({ message: "Unable to update the mission plan", error }),
                    ),
                  ),
                ),
              )
            return {
              output: { steps },
              content: summarize(steps),
              metadata: { steps },
            }
          }),
      }),
    )
    .pipe(Effect.orDie)
})
