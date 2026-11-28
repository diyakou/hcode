import { For, Show, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { ComposerPill, createKeyed, type ComposerPillProps, type Plugin } from "@opencode/plugin/gui"
import { Mission } from "@opencode/schema/mission"
import { Button } from "@opencode/ui/button"
import type MissionDefinition from "./index"

const setup: Plugin.Setup<typeof MissionDefinition> = (ctx) => {
  const [missions, setMissions] = createStore<Record<string, Mission.State | null>>({})
  ctx.add(ComposerPill, {
    id: "mission",
    order: 80,
    render: (props: ComposerPillProps) => {
      const mission = missions[props.session.key]
      return <Show when={mission} keyed>
        {(value) => <Button size="small" variant="ghost" onClick={() => void props.popover.toggle()}>
          {value.status === "complete" ? "Mission complete" : `Mission: ${value.steps.filter((step) => step.status === "done").length}/${value.steps.length}`}
        </Button>}
      </Show>
    },
  })
  createKeyed(() => ctx.sessions.current(), (session) => {
    const rpc = session.server.client.rpc(Mission.Definition)
    const load = () => rpc.get({ sessionID: session.id }, { location: { directory: session.directory }, signal: ctx.signal }).then((value) => setMissions(session.key, value))
    void load()
    const subscription = rpc.events.changed.subscribe((event) => {
      if (event.sessionID === session.id) setMissions(session.key, event.mission)
    })
    onCleanup(() => subscription.unsubscribe())
  })
}

export default setup
