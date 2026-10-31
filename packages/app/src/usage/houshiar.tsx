import type { LocationRef } from "@opencode/client/promise"
import { Houshiar } from "@opencode/schema/houshiar"
import { Button } from "@opencode/ui/button"
import { Dialog, DialogBody, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { Loader } from "@opencode/ui/loader"
import { onMount, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { useLanguage } from "@/runtime/i18n/language"
import { useServerSDK } from "@/runtime/server/client"
import { formatServerError } from "@/runtime/server/errors"

export function HoushiarUsageDialog(props: { location?: LocationRef }) {
  const sdk = useServerSDK()
  const language = useLanguage()
  const [state, setState] = createStore({ loading: true, summary: "", error: "" })
  const load = () => {
    setState({ loading: true, error: "" })
    void sdk.api
      .rpc(Houshiar.Definition)
      .usage({}, { location: props.location })
      .then(
        (summary) => setState({ loading: false, summary }),
        (error) => setState({ loading: false, error: formatServerError(error, language.t) }),
      )
  }
  onMount(load)
  return (
    <Dialog>
      <DialogHeader>
        <DialogTitle>{language.t("houshiar.usage")}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <Show when={!state.loading} fallback={<Loader />}>
          <Show
            when={!state.error}
            fallback={
              <div class="flex flex-col gap-3">
                <p>{state.error}</p>
                <Button onClick={load}>{language.t("usage.retry")}</Button>
              </div>
            }
          >
            <pre class="whitespace-pre-wrap">{state.summary}</pre>
          </Show>
        </Show>
      </DialogBody>
    </Dialog>
  )
}
