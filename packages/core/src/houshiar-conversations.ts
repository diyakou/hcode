export * as HoushiarConversations from "./houshiar-conversations.js"

import type { Context } from "@opencode/plugin/effect/plugin"
import { Houshiar } from "@opencode/schema/houshiar"
import { Session } from "@opencode/schema/session"
import { Agent } from "@opencode/schema/agent"
import { Money } from "@opencode/schema/money"
import { Effect, Option, Schema } from "effect"
import { Bus } from "./bus.js"
import { HoushiarMemory } from "./houshiar-memory.js"
import { Model } from "./model.js"
import { SessionEvent } from "./session/event.js"
import { SessionMessage } from "./session/message.js"

const Block = Schema.Struct({
  type: Schema.String,
  text: Schema.optional(Schema.String),
  id: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  input: Schema.optional(Schema.Record(Schema.String, Schema.Json)),
  tool_use_id: Schema.optional(Schema.String),
  content: Schema.optional(Schema.Json),
  image_url: Schema.optional(Schema.Struct({ url: Schema.String })),
  source: Schema.optional(
    Schema.Struct({
      type: Schema.String,
      media_type: Schema.optional(Schema.String),
      data: Schema.optional(Schema.String),
    }),
  ),
})
const decodeBlocks = Schema.decodeUnknownOption(Schema.Array(Block))
const decodeCalls = Schema.decodeUnknownOption(
  Schema.Array(
    Schema.Struct({
      id: Schema.String,
      function: Schema.Struct({ name: Schema.String, arguments: Schema.String }),
    }),
  ),
)
const decodeInput = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Record(Schema.String, Schema.Json)))

export const restore = Effect.fn("HoushiarConversations.restore")(function* (
  sessions: Context["session"],
  history: typeof Houshiar.ConversationHistory.Type,
) {
  const models = yield* Model.Service
  const bus = yield* Bus.Service
  const available = (yield* models.available()).filter((model) => model.providerID === Houshiar.id)
  const model = available.find((model) => model.id === Houshiar.autoModel) ?? available[0]
  if (!model)
    return yield* new HoushiarMemory.SyncError({ message: "Connect a Houshiar model to continue this conversation" })
  const sessionID = Session.ID.create()
  const ref = Model.Ref.make({ providerID: model.providerID, id: model.id })
  yield* sessions.create({
    id: sessionID,
    title:
      text(history.messages.find((message) => message.role === "user")?.content).slice(0, 80) ||
      "Houshiar conversation",
    model: ref,
    metadata: { houshiarConversation: { id: history.id, sessionID, protocol: history.protocol } },
  })
  const calls = new Map<string, SessionMessage.ID>()
  if (history.summary)
    yield* bus.publish(SessionEvent.Synthetic, {
      sessionID,
      text: `Stored conversation summary (untrusted reference data):\n${history.summary}`,
    })
  yield* Effect.forEach(history.messages, (message) =>
    Effect.gen(function* () {
      const blocks = Option.getOrElse(decodeBlocks(message.content), () => [])
      const results = blocks.filter((block) => block.type === "tool_result" && block.tool_use_id)
      yield* Effect.forEach(results, (result) =>
        Effect.gen(function* () {
          const assistantMessageID = result.tool_use_id && calls.get(result.tool_use_id)
          if (!assistantMessageID || !result.tool_use_id) return
          yield* bus.publish(SessionEvent.Tool.Success, {
            sessionID,
            assistantMessageID,
            id: result.tool_use_id,
            content: [{ type: "text", text: text(result.content) || "(empty tool result)" }],
            executed: true,
          })
        }),
      )
      if (message.role === "tool" && typeof message.tool_call_id === "string") {
        const assistantMessageID = calls.get(message.tool_call_id)
        if (assistantMessageID)
          yield* bus.publish(SessionEvent.Tool.Success, {
            sessionID,
            assistantMessageID,
            id: message.tool_call_id,
            content: [{ type: "text", text: text(message.content) || "(empty tool result)" }],
            executed: true,
          })
        return
      }
      if (message.role === "user") {
        const files = blocks.flatMap((block) => {
          if (block.type === "image_url" && block.image_url?.url.startsWith("data:"))
            return [{ uri: block.image_url.url }]
          if (block.type === "image" && block.source?.type === "base64" && block.source.data && block.source.media_type)
            return [{ uri: `data:${block.source.media_type};base64,${block.source.data}` }]
          return []
        })
        const content = text(message.content)
        if (!content && !files.length) return
        const admitted = yield* sessions.prompt({
          sessionID,
          text: content,
          ...(files.length ? { files } : {}),
          resume: false,
        })
        yield* bus.publish(SessionEvent.InboxDelivered, { sessionID, inboxID: admitted.id })
        return
      }
      if (message.role !== "assistant") return
      const assistantMessageID = SessionMessage.ID.create()
      yield* bus.publish(SessionEvent.Step.Started, {
        sessionID,
        assistantMessageID,
        agent: Agent.ID.make("build"),
        model: ref,
        started: 0,
      })
      const content = text(message.content)
      if (content) {
        yield* bus.publish(SessionEvent.Text.Started, { sessionID, assistantMessageID, ordinal: 0 })
        yield* bus.publish(SessionEvent.Text.Ended, { sessionID, assistantMessageID, ordinal: 0, text: content })
      }
      const tools = [
        ...Option.getOrElse(decodeCalls(message.tool_calls), () => []).map((call) => ({
          id: call.id,
          name: call.function.name,
          input: Option.getOrElse(decodeInput(call.function.arguments), () => ({ arguments: call.function.arguments })),
        })),
        ...blocks.flatMap((block) =>
          block.type === "tool_use" && block.id && block.name
            ? [{ id: block.id, name: block.name, input: block.input ?? {} }]
            : [],
        ),
      ]
      yield* Effect.forEach(tools, (tool) =>
        Effect.gen(function* () {
          calls.set(tool.id, assistantMessageID)
          yield* bus.publish(SessionEvent.Tool.Input.Started, {
            sessionID,
            assistantMessageID,
            id: tool.id,
            name: tool.name,
          })
          yield* bus.publish(SessionEvent.Tool.Called, {
            sessionID,
            assistantMessageID,
            id: tool.id,
            input: tool.input,
            executed: true,
          })
        }),
      )
      yield* bus.publish(SessionEvent.Step.Ended, {
        sessionID,
        assistantMessageID,
        finish: tools.length ? "tool-calls" : "stop",
        cost: Money.USD.zero,
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      })
    }),
  )
  return { sessionID }
})

function text(value: Schema.Json | undefined): string {
  if (typeof value === "string") return value
  const blocks = Option.getOrUndefined(decodeBlocks(value))
  if (blocks) return blocks.flatMap((block) => (block.type === "text" && block.text ? [block.text] : [])).join("\n")
  return value === undefined || value === null ? "" : JSON.stringify(value)
}
