export * as MissionTool from "./mission-update.js"

import { ToolFailure } from "@opencode/ai/effect"
import type { Context } from "@opencode/plugin/effect/plugin"
import { Effect, Schema } from "effect"
import { Mission } from "@opencode/schema/mission"
import { Permission } from "../../permission.js"
import DESCRIPTION from "../mission-update.txt"

export const name = "mission_update"

export const Input = Schema.Struct({
  steps: Schema.Array(Mission.Step).annotate({
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

export const Plugin = {
  id: "opencode.tool.mission",
  effect: Effect.fn("MissionTool.Plugin")(function* (ctx: Context) {
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
            ctx.storage.get(`session:${context.sessionID}`).pipe(
              Effect.flatMap((stored) => {
                const mission = stored === undefined ? undefined : Schema.decodeUnknownOption(Mission.State)(stored)
                if (mission === undefined || mission._tag === "None") return new ToolFailure({ message: "No mission is active in this session." })
                return ctx.storage.set(`session:${context.sessionID}`, {
                  ...mission.value,
                  steps: input.steps,
                  updatedAt: Date.now(),
                })
              }),
              Effect.mapError((error) =>
                error instanceof ToolFailure ? error : new ToolFailure({ message: "Unable to update the mission plan", error }),
              ),
              Effect.andThen(
                permission.assert({
                  action: name,
                  resources: ["*"],
                  save: ["*"],
                  sessionID: context.sessionID,
                  agent: context.agent,
                  source: { type: "tool", messageID: context.messageID, id: context.id },
                }).pipe(Effect.mapError((error) => new ToolFailure({ message: "Unable to update the mission plan", error }))),
              ),
              Effect.as({
                output: { steps: input.steps },
                content: summarize(input.steps),
                metadata: { steps: input.steps },
              }),
            ),
        }),
      )
      .pipe(Effect.orDie)
  }),
}
