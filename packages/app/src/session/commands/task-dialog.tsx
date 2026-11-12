import { useData } from "@/runtime/server/current"
import { useParams } from "@solidjs/router"
import { Button } from "@opencode/ui/button"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { TextInput } from "@opencode/ui/text-input"
import { useDialog } from "@opencode/ui/context/dialog"
import { useLanguage } from "@/runtime/i18n/language"
import { useServerSDK } from "@/runtime/server/client"
import { formatServerError } from "@/runtime/server/errors"
import { showToast } from "@/shell/notifications/toast"

export function DialogTask(props: { mode?: "now" | "later" }) {
  const params = useParams()
  const dialog = useDialog()
  const language = useLanguage()
  const sdk = useServerSDK()
  const data = useData()
  const [state, setState] = createStore({ prompt: "", minutes: "60", loading: false, error: "" })
  const submit = async () => {
    if (!params.id || !state.prompt.trim()) return
    setState({ loading: true, error: "" })
    try {
      if (state.mode === "now") {
        await data.session.prompt({ sessionID: params.id, text: state.prompt.trim() })
        showToast({ title: language.t("task.schedule.started") })
        dialog.close()
        return
      }
      await sdk.api.experimental.schedule.create({
        sessionID: params.id,
        prompt: state.prompt.trim(),
        when: { in: `${Math.max(1, Number(state.minutes) || 1)} minutes` },
      })
      showToast({ title: language.t("task.schedule.created") })
      dialog.close()
    } catch (error) {
      setState({ error: formatServerError(error, language.t) })
    } finally {
      setState("loading", false)
    }
  }
  return (
    <Dialog>
      <DialogHeader>
        <DialogTitle>{language.t("task.schedule.title")}</DialogTitle>
      </DialogHeader>
      <DialogBody class="flex flex-col gap-3">
        <label class="flex flex-col gap-1">
          <span>{language.t("task.schedule.prompt")}</span>
          <textarea
            class="min-h-32 w-full resize-y rounded-md border border-border-base bg-background-base px-3 py-2 text-14-regular"
            value={state.prompt}
            onInput={(event) => setState("prompt", event.currentTarget.value)}
            placeholder={language.t("task.schedule.prompt.placeholder")}
            autofocus
          />
        </label>
        <Show when={props.mode === "later"}>
          <label class="flex flex-col gap-1">
            <span>{language.t("task.schedule.delay")}</span>
            <TextInput
              type="number"
              min="1"
              value={state.minutes}
              onInput={(event) => setState("minutes", event.currentTarget.value)}
            />
          </label>
        </Show>
        <Show when={state.error}><p role="alert">{state.error}</p></Show>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={() => dialog.close()}>{language.t("common.cancel")}</Button>
        <Button disabled={state.loading || !state.prompt.trim()} onClick={submit}>
          {language.t(
            state.loading
              ? "task.schedule.saving"
              : props.mode === "later"
                ? "task.schedule.submit"
                : "task.schedule.run",
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
