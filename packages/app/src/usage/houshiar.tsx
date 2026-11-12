import type { LocationRef } from "@opencode/client/promise"
import { Houshiar } from "@opencode/schema/houshiar"
import { Button } from "@opencode/ui/button"
import { Dialog, DialogBody, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { Loader } from "@opencode/ui/loader"
import { onMount, Show } from "solid-js"
import { createStore } from "solid-js/store"
import type { ModelSelection } from "@/providers/models/selection"
import { useLanguage } from "@/runtime/i18n/language"
import { useServerSDK } from "@/runtime/server/client"
import { formatServerError } from "@/runtime/server/errors"

export function HoushiarUsageDialog(props: {
  location?: LocationRef
  model?: Pick<ModelSelection, "current">
}) {
  const sdk = useServerSDK()
  const language = useLanguage()
  const [state, setState] = createStore({ loading: true, summary: "", fiveHour: undefined as Houshiar.FiveHourStatus.Type | undefined, error: "" })
  const load = () => {
    setState({ loading: true, error: "" })
    const current = props.model?.current()
    const selected = current ? `${current.provider.id}/${current.id}` : undefined
    void Promise.all([
      sdk.api.rpc(Houshiar.Definition).usage({}, { location: props.location }),
      sdk.api.rpc(Houshiar.Definition).fiveHour({ model: selected }, { location: props.location }),
    ]).then(
      ([summary, fiveHour]) => setState({ loading: false, summary, fiveHour }),
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
            <div class="flex flex-col gap-4">
              <pre class="whitespace-pre-wrap">{state.summary}</pre>
              <Show when={state.fiveHour} fallback={<p>اطلاعات مصرف ۵ساعته در دسترس نیست.</p>}>
                {(status) => (
                  <section class="flex flex-col gap-2 rounded-md border border-border-base p-3">
                    <h3 class="font-medium">محدودیت ۵ ساعته</h3>
                    <Show when={status().five_hour} fallback={<p>اطلاعات مصرف ۵ساعته در دسترس نیست.</p>}>
                      {(quota) => (
                        <div class="flex flex-col gap-1">
                          <Show when={quota().credits?.limit != null}>
                            <p>اعتبار: {quota().credits?.used ?? 0} مصرف‌شده + {quota().credits?.reserved ?? 0} رزروشده / {quota().credits?.limit}</p>
                          </Show>
                          <Show when={quota().requests?.limit != null}>
                            <p>درخواست‌ها: {quota().requests?.used ?? 0} / {quota().requests?.limit}</p>
                          </Show>
                          <Show when={quota().limit_reached}><p>سقف ۵ساعته پر شده است.</p></Show>
                        </div>
                      )}
                    </Show>
                    <Show when={status().models}>
                      {(models) => (
                        <div class="flex flex-col gap-1">
                          <p>مدل انتخابی: {models().selected ?? "—"}</p>
                          <p>آخرین مدل پاسخ‌دهنده: {models().last_served ?? "—"}</p>
                          <p>مدل مورد انتظار درخواست بعدی: {models().next_request_expected ?? "—"}</p>
                        </div>
                      )}
                    </Show>
                  </section>
                )}
              </Show>
            </div>
          </Show>
        </Show>
      </DialogBody>
    </Dialog>
  )
}
