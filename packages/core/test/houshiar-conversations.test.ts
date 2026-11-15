import { expect } from "bun:test"
import { Effect } from "effect"
import { Houshiar } from "@opencode/schema/houshiar"
import { HoushiarConversations } from "@opencode/core/houshiar-conversations"
import { HoushiarMemory } from "@opencode/core/houshiar-memory"
import { Model } from "@opencode/core/model"
import { Provider } from "@opencode/core/provider"
import { Plugin } from "@opencode/core/plugin"
import { PluginHost } from "@opencode/core/plugin/host"
import { Session } from "@opencode/core/session"
import { testEffect } from "./lib/effect"
import { PluginTestLayer } from "./plugin/fixture"

const it = testEffect(PluginTestLayer)

;(["openai", "anthropic"] as const).forEach((protocol) => {
  it.effect(`restores ${protocol} account history without executing it or mixing it with another chat`, () =>
    Effect.gen(function* () {
      const providers = yield* Provider.Service
      const sessions = yield* Session.Service
      const plugin = yield* Plugin.Service
      const host = yield* PluginHost.make(plugin)
      yield* providers.transform((editor) =>
        editor.add({
          info: { ...Provider.Info.empty(Provider.ID.make(Houshiar.id)), activation: "enabled" },
          models: [
            {
              ...Model.Info.default(Provider.ID.make(Houshiar.id), Model.ID.make("test-model")),
              enabled: true,
              package:
                protocol === "anthropic"
                  ? "@opencode/ai/providers/anthropic-compatible"
                  : "@opencode/ai/providers/openai-compatible",
            },
          ],
        }),
      )
      const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
      const history: typeof Houshiar.ConversationHistory.Type = {
        id: "shared_backend_chat",
        protocol: protocol === "anthropic" ? "anthropic" : "openai",
        revision: 5,
        created_at: "2026-11-15T08:00:00Z",
        updated_at: "2026-11-15T08:00:00Z",
        summary: "",
        system: null,
        messages:
          protocol === "anthropic"
            ? [
                {
                  role: "user",
                  content: [
                    { type: "text", text: "shared question" },
                    { type: "image", source: { type: "base64", media_type: "image/png", data: png } },
                  ],
                },
                {
                  role: "assistant",
                  content: [{ type: "tool_use", id: "call_1", name: "read", input: { path: "file.ts" } }],
                },
                { role: "user", content: [{ type: "tool_result", tool_use_id: "call_1", content: "file contents" }] },
                { role: "assistant", content: [{ type: "text", text: "shared answer" }] },
              ]
            : [
                {
                  role: "user",
                  content: [
                    { type: "text", text: "shared question" },
                    { type: "image_url", image_url: { url: `data:image/png;base64,${png}` } },
                  ],
                },
                {
                  role: "assistant",
                  content: "",
                  tool_calls: [
                    { id: "call_1", type: "function", function: { name: "read", arguments: '{"path":"file.ts"}' } },
                  ],
                },
                { role: "tool", tool_call_id: "call_1", content: "file contents" },
                { role: "assistant", content: "shared answer" },
              ],
      }
      const restored = yield* HoushiarConversations.restore(host.session, history)
      const session = yield* sessions.get(restored.sessionID)
      expect(HoushiarMemory.binding(session)).toEqual({ id: history.id, sessionID: session.id, protocol })
      expect(session.id === history.id).toBe(false)
      expect(yield* sessions.inbox(session.id)).toEqual([])
      const messages = yield* sessions.context(session.id)
      expect(messages.map((message) => message.type)).toEqual(["user", "assistant", "assistant"])
      const user = messages.find((message) => message.type === "user")
      expect(user?.text).toBe("shared question")
      expect(user?.files?.[0]?.data).toBe(png)
      const assistant = messages.find((message) => message.type === "assistant")
      expect(assistant?.type === "assistant" && assistant.content).toMatchObject([
        {
          type: "tool",
          name: "read",
          state: {
            status: "completed",
            input: { path: "file.ts" },
            content: [{ type: "text", text: "file contents" }],
          },
        },
      ])
      expect(messages.at(-1)).toMatchObject({ type: "assistant", content: [{ type: "text", text: "shared answer" }] })
      const child = yield* sessions.create({ parentID: session.id })
      expect(HoushiarMemory.binding(child)).toBeUndefined()
      expect(yield* sessions.context(child.id)).toEqual([])
      expect(yield* sessions.context(session.id)).toEqual(messages)
    }),
  )
})
