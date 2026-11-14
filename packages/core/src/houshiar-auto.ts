export * as HoushiarAuto from "./houshiar-auto.js"

import type { Model } from "@opencode/schema/model"

export type Prompt = {
  readonly text: string
  readonly attachments: boolean
}

/**
 * Select from an already available catalog. The tiers are local name-based heuristics,
 * not guarantees about price or quality. Callers must filter for any attachment types
 * and other request-specific capabilities before passing the catalog.
 */
export function select(models: readonly Model.Info[], prompt: Prompt): Model.Info | undefined {
  const simple = !prompt.attachments && isSimple(prompt.text)
  return models
    .filter((model) => {
      if (!model.enabled || (model.type ?? "chat") !== "chat") return false
      if (!model.capabilities.input.includes("text") || !model.capabilities.output.includes("text")) return false
      return ![model.id, model.modelID].some((id) => id.toLowerCase().split("/").at(-1) === "auto")
    })
    .toSorted((a, b) => {
      const tier = (model: Model.Info) => {
        const family = identify(model)
        if (simple && family === "small") return 3
        if (family === "strong") return 2
        if (family === "unknown") return 1
        return 0
      }
      return (
        tier(b) - tier(a) ||
        Number(b.status === "active") - Number(a.status === "active") ||
        b.time.released - a.time.released ||
        (a.providerID < b.providerID ? -1 : a.providerID > b.providerID ? 1 : 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      )
    })[0]
}

function isSimple(text: string): boolean {
  const value = text.trim().toLowerCase()
  if (value.length > 80) return false
  return (
    /^(?:hi|hello|hey|thanks|thank you|good morning|good evening)[!. ]*$/.test(value) ||
    /^(?:what is |calculate )?\d{1,4}\s*[+\-*/]\s*\d{1,4}\s*\??$/.test(value)
  )
}

function identify(model: Model.Info): "strong" | "small" | "unknown" {
  const name = `${model.id} ${model.modelID}`.toLowerCase().replace(/[^a-z0-9]+/g, " ")
  if (/\bclaude\s+(?:\d+\s+)*haiku\b|\bgemini\s+(?:\d+\s+)*flash\b|\bgpt\s+(?:4\s+o|4\s+1|5)(?:\s+\d+)*\s+(?:mini|nano)\b/.test(name))
    return "small"
  if (/\bclaude\s+(?:\d+\s+)*(?:opus|sonnet)\b|\bgemini\s+(?:\d+\s+)*pro\b|\bgpt\s+(?:4\s+o|4\s+1|5)\b/.test(name))
    return "strong"
  return "unknown"
}
