import { onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { ComposerPill, createKeyed, type Plugin } from "@opencode/plugin/gui"
import { Mission } from "@opencode/schema/mission"
import type MissionDefinition from "./index"

const setup: Plugin.Setup<typeof MissionDefinition> = (ctx) => {
  const [missions, setMissions] = createStore<Record<string, { mission: Mission.State | null }>>({})
  const key = (server: string, sessionID: string) => `${server}\u0000${sessionID}`

  // Refetch after routing, moving directories, or reconnecting: changes may have been missed.
  createKeyed(
    () => {
      const session = ctx.sessions.current()

      return session?.server.connected ? key(session.server.id, session.id) + `\u0000${session.directory}` : undefined
    },
    () => {
      const session = ctx.sessions.current()

      if (!session) return

      const server = session.server.id
      const rpc = session.server.client.rpc(Mission.Definition)
      const controller = new AbortController()
      // A change received before the snapshot is newer than it.
      const heard = { value: false }
      onCleanup(() => controller.abort())
      onCleanup(
        rpc.events.on(
          "changed",
          (event) => {
            if (event.data.sessionID === session.id) heard.value = true
            const missionKey = key(server, event.data.sessionID)
            const previous = missions[missionKey]?.mission
            const next = event.data.mission
            setMissions(missionKey, { mission: next })

            if (previous && previous.status !== "complete" && next?.status === "complete") {
              const notification = {
                title: ctx.t("notification.complete.title"),
                description: next.reason,
                variant: "success" as const,
              }

              ctx.toast.show(notification)

              void ctx.attention.notify({
                title: notification.title,
                message: next.reason,
                session: { server, id: event.data.sessionID },
                id: `${missionKey}\u0000${next.id}`,
              })
            }
          },
          { signal: controller.signal },
        ),
      )
      // Older servers may not provide the mission RPC.
      void rpc
        .get({ sessionID: session.id }, { location: { directory: session.directory }, signal: controller.signal })
        .then(
          (next) => {
            if (!controller.signal.aborted && !heard.value) setMissions(key(server, session.id), { mission: next })
          },
          () => undefined,
        )
    },
  )

  ctx.add(ComposerPill, {
    id: "mission",
    order: 80,
    show: (input) => {
      const mission = missions[key(input.session.server.id, input.session.id)]?.mission

      if (!mission) return

      return {
        label:
          mission.status === "complete"
            ? ctx.t("pill.complete")
            : ctx.t("pill.progress", {
                done: mission.steps.filter((step) => step.status === "done").length,
                total: mission.steps.length,
              }),
      }
    },
  })
}

export default setup
