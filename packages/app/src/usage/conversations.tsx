import { Houshiar } from "@opencode/schema/houshiar"
import { Button } from "@opencode/ui/button"
import { Dialog, DialogBody, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { useDialog } from "@opencode/ui/context/dialog"
import { Loader } from "@opencode/ui/loader"
import { useNavigate } from "@solidjs/router"
import { For, Show, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { Option, Schema } from "effect"
import { useLanguage } from "@/runtime/i18n/language"
import { useServerSDK } from "@/runtime/server/client"
import { useServer } from "@/runtime/server/current"
import { formatServerError } from "@/runtime/server/errors"
import { sessionHref } from "@/shell/routes/session"

export function HoushiarConversationsDialog(props: { directory: string }) {
  const sdk = useServerSDK()
  const server = useServer()
  const dialog = useDialog()
  const navigate = useNavigate()
  const language = useLanguage()

  const [state, setState] = createStore<{
    loading: boolean
    error: string
    offset: number
    items: ReadonlyArray<typeof Houshiar.Conversation.Type>
    history: typeof Houshiar.ConversationHistory.Type | undefined
  }>({ loading: true, error: "", offset: 0, items: [], history: undefined })

  const options = () => ({ location: { directory: props.directory } })
  const failed = (error: unknown) => setState("error", formatServerError(error, language.t))

  const load = async (offset = 0) => {
    setState({ loading: true, error: "", history: undefined })
    await sdk.api
      .rpc(Houshiar.Definition)
      .conversations({ offset }, options())
      .then((response) => setState({ items: response.data, offset }))
      .catch(failed)
    setState("loading", false)
  }

  const select = async (id: string) => {
    setState({ loading: true, error: "" })
    await sdk.api
      .rpc(Houshiar.Definition)
      .conversation({ id }, options())
      .then((history) => setState("history", history))
      .catch(failed)
    setState("loading", false)
  }

  const resume = async () => {
    const history = state.history

    if (!history) return

    setState({ loading: true, error: "" })
    await sdk.api
      .rpc(Houshiar.Definition)
      .continueConversation({ id: history.id }, options())
      .then((created) => {
        dialog.close()
        navigate(sessionHref(server.key, created.sessionID))
      })
      .catch(failed)
    setState("loading", false)
  }

  onMount(() => void load())

  return (
    <Dialog size="large">
      <DialogHeader>
        <DialogTitle>{language.t("houshiar.conversations.title")}</DialogTitle>
      </DialogHeader>
      <DialogBody class="flex flex-col gap-4 overflow-y-auto">
        <Show when={state.error}>
          <p role="alert">{state.error}</p>
        </Show>
        <Show when={state.loading}>
          <Loader />
        </Show>
        <Show
          when={state.history}
          fallback={
            <>
              <p>{language.t("houshiar.conversations.description")}</p>
              <Show when={!state.loading && state.items.length === 0}>
                <p>{language.t("houshiar.conversations.empty")}</p>
              </Show>
              <For each={state.items}>
                {(item) => (
                  <Button variant="ghost" disabled={state.loading} onClick={() => void select(item.id)}>
                    <span>{item.id.slice(0, 12)}</span>
                    <span>{new Date(item.updated_at).toLocaleString()}</span>
                  </Button>
                )}
              </For>
              <div class="flex gap-2">
                <Button
                  variant="ghost"
                  disabled={state.loading || state.offset === 0}
                  onClick={() => void load(state.offset - 20)}
                >
                  {language.t("houshiar.conversations.previous")}
                </Button>
                <Button
                  variant="ghost"
                  disabled={state.loading || state.items.length < 20}
                  onClick={() => void load(state.offset + 20)}
                >
                  {language.t("houshiar.conversations.next")}
                </Button>
              </div>
            </>
          }
        >
          {(history) => (
            <>
              <Show when={history().summary}>
                <p class="whitespace-pre-wrap">{history().summary}</p>
              </Show>
              <For each={history().messages}>
                {(message) => (
                  <div class="flex flex-col gap-1">
                    <strong>{String(message.role ?? "")}</strong>
                    <p class="whitespace-pre-wrap break-words">{contentText(message.content)}</p>
                  </div>
                )}
              </For>
              <div class="flex gap-2">
                <Button variant="ghost" disabled={state.loading} onClick={() => setState("history", undefined)}>
                  {language.t("houshiar.conversations.back")}
                </Button>
                <Button disabled={state.loading} onClick={() => void resume()}>
                  {language.t("houshiar.conversations.continue")}
                </Button>
              </div>
            </>
          )}
        </Show>
      </DialogBody>
    </Dialog>
  )
}

const decodeText = Schema.decodeUnknownOption(Schema.Struct({ type: Schema.Literal("text"), text: Schema.String }))

function contentText(content: Schema.Json | undefined) {
  if (typeof content === "string") return content

  if (!Array.isArray(content)) return ""
  return content.flatMap((block) => Option.toArray(decodeText(block)).map((item) => item.text)).join("\n")
}
