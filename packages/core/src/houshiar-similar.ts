export * as HoushiarSimilar from "./houshiar-similar.js"

import { Houshiar } from "@opencode/schema/houshiar"
import { Model } from "@opencode/schema/model"

/** Rank eligible alternatives from the effective Houshiar catalog, without changing it. */
export function select(original: Model.Info, models: readonly Model.Info[]): Model.Info[] {
  if (original.providerID !== Houshiar.id) return []
  const family = identify(original)
  if (!family) return []
  const input = Math.min(original.limit.input || original.limit.context, original.limit.context)
  if (input <= 0 || original.limit.context <= 0 || original.limit.output <= 0) return []

  return models
    .filter((model) => {
      if (model.providerID !== original.providerID || model.id === original.id || !model.enabled) return false
      if ((model.type ?? "chat") !== "chat" || identify(model) !== family) return false
      return (
        model.limit.context >= original.limit.context &&
        Math.min(model.limit.input || model.limit.context, model.limit.context) >= input &&
        model.limit.output >= original.limit.output
      )
    })
    .toSorted((a, b) =>
      a.limit.context - b.limit.context ||
      Math.min(a.limit.input || a.limit.context, a.limit.context) -
        Math.min(b.limit.input || b.limit.context, b.limit.context) ||
      a.limit.output - b.limit.output ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
}

function identify(model: Model.Info): string | undefined {
  const matches = [model.id, model.name].flatMap((value) => {
    const text = value.toLowerCase().replace(/[^a-z0-9]+/g, " ")
    const found: string[] = []
    for (const match of text.matchAll(/\bclaude\s+(?:(?:\d+\s+)*)(opus|sonnet|haiku)\b|\bclaude\s+(opus|sonnet|haiku)\b/g))
      found.push(`claude-${match[1] ?? match[2]}`)
    for (const match of text.matchAll(/\bgemini\s+(?:\d+\s+)*(pro|flash)(?:\s+(lite))?\b/g))
      found.push(`gemini-${match[1]}${match[2] ? "-lite" : ""}`)
    for (const match of text.matchAll(/\bgpt\s+(4\s+o|4\s+1|5)(?:\s+\d+)?(?:\s+(mini|nano))?\b/g))
      found.push(`gpt-${match[1]!.replace(/\s/g, "")}${match[2] ? `-${match[2]}` : ""}`)
    return found
  })
  const families = new Set(matches)
  return families.size === 1 ? matches[0] : undefined
}
