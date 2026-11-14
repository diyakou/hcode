import { describe, expect, test } from "bun:test"
import { Model } from "@opencode/schema/model"
import { Provider } from "@opencode/schema/provider"
import { HoushiarSimilar } from "../src/houshiar-similar"

const provider = Provider.ID.make("houshiar")
const model = (id: string, changes: Partial<Model.Info> = {}): Model.Info => ({
  ...Model.Info.default(provider, Model.ID.make(id)),
  ...changes,
})

describe("Houshiar similar models", () => {
  test("ranks same-family alternatives with sufficient effective limits deterministically", () => {
    const original = model("anthropic/claude-sonnet-4", { limit: { context: 100, input: 80, output: 20 } })
    const near = model("claude-3-7-sonnet", { limit: { context: 100, input: 80, output: 20 } })
    const tie = model("claude-sonnet-4-5", { limit: { context: 100, input: 80, output: 20 } })
    const larger = model("claude-sonnet-4-6", { limit: { context: 200, output: 30 } })
    const list = [larger, tie, original, near]
    expect(HoushiarSimilar.select(original, list).map((item) => item.id)).toEqual([near.id, tie.id, larger.id])
    expect(HoushiarSimilar.select(original, list.toReversed()).map((item) => item.id)).toEqual([
      near.id,
      tie.id,
      larger.id,
    ])
    expect(list).toEqual([larger, tie, original, near])
  })

  test("rejects smaller context, effective input, or output and ineligible models", () => {
    const original = model("claude-sonnet-4", { limit: { context: 100, input: 80, output: 20 } })
    const options = [
      model("claude-sonnet-3", { limit: { context: 99, output: 20 } }),
      model("claude-sonnet-5", { limit: { context: 100, input: 79, output: 20 } }),
      model("claude-sonnet-6", { limit: { context: 100, output: 19 } }),
      model("claude-sonnet-7", { enabled: false }),
      model("claude-sonnet-8", { providerID: Provider.ID.make("other") }),
      model("claude-sonnet-9", { type: "image" }),
      model("claude-opus-4"),
    ]
    expect(HoushiarSimilar.select(original, options)).toEqual([])
    expect(HoushiarSimilar.select(model("claude-sonnet-4", { providerID: Provider.ID.make("other") }), options)).toEqual([])
  })

  test("requires unambiguous identity from IDs or names and ignores family metadata", () => {
    const original = model("alias", { name: "Claude Sonnet 4" })
    const named = model("another-alias", { name: "Claude 3.7 Sonnet" })
    const ambiguous = model("claude-sonnet-4", { name: "Claude Opus 4" })
    const unknown = model("mystery", { family: Model.Family.make("claude-sonnet") })
    expect(HoushiarSimilar.select(original, [named, ambiguous, unknown])).toEqual([named])
    expect(HoushiarSimilar.select(ambiguous, [named])).toEqual([])
    expect(HoushiarSimilar.select(unknown, [named])).toEqual([])
  })

  test("distinguishes model tiers", () => {
    const original = model("google/gemini-2.5-flash")
    const flash = model("gemini-3-flash")
    expect(HoushiarSimilar.select(original, [model("gemini-2.5-flash-lite"), model("gemini-2.5-pro"), flash])).toEqual([flash])
    expect(HoushiarSimilar.select(model("gpt-5-mini"), [model("gpt-5"), model("gpt-5-nano")])).toEqual([])
  })
})
