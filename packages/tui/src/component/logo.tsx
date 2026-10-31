import { TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { Show } from "solid-js"
import { useTheme } from "../context/theme"

export function Logo() {
  const theme = useTheme()
  const dimensions = useTerminalDimensions()
  return (
    <box alignItems="center" gap={1}>
      <text fg={theme.text.base} attributes={TextAttributes.BOLD}>
        Houshiar
      </text>
      <Show when={dimensions().width >= 24 && dimensions().height >= 16}>
        <text fg={theme.text.muted}>wqai.morvism.ir</text>
      </Show>
    </box>
  )
}
