import http from "node:http"
import { getCACertificates, setDefaultCACertificates } from "node:tls"
import { app } from "electron"
import { Effect, Path } from "effect"
import { discoverSystemProxy } from "@opencode/util/proxy-discovery"
import { DesktopPaths } from "../paths"
import { getUserShell, loadShellEnv } from "../service/shell-env"
import { registerRendererProtocol, setDockIcon, setProtocolReporter } from "../windows"
import { scoped } from "../native/logging"
import { applySpellcheck, spellcheckMenuItems } from "../native/spellcheck"

// electron-context-menu attaches to every existing and future window, so it can load once the first
// window is up instead of holding up startup with its dependency tree.
export const installContextMenu = Effect.gen(function* () {
  const { default: contextMenu } = yield* Effect.promise(() => import("electron-context-menu"))
  contextMenu({
    showSaveImageAs: true,
    showLookUpSelection: false,
    showSearchWithGoogle: false,
    append: (_actions, params) => (params.isEditable ? spellcheckMenuItems() : []),
  })
})

export const prepareApplicationEnvironment = Effect.gen(function* () {
  yield* loadSystemCertificates
  yield* loadProxyEnvironment
})

export const preferApplicationEnvironment = Effect.gen(function* () {
  const shell = process.platform === "win32" ? null : getUserShell()
  const shellEnv = shell ? yield* loadShellEnv(shell) : null
  yield* Effect.sync(() => {
    if (!shellEnv?.XDG_STATE_HOME) delete process.env.XDG_STATE_HOME
    Object.assign(process.env, {
      ...shellEnv,
      OPENCODE_EXPERIMENTAL_ICON_DISCOVERY: "true",
      OPENCODE_EXPERIMENTAL_FILEWATCHER: "true",
      OPENCODE_CLIENT: "desktop",
    })
  })
})

export const prepareDesktop = Effect.gen(function* () {
  const path = yield* Path.Path
  const paths = yield* DesktopPaths.resolve

  if (app.isPackaged || process.env.OPENCODE_DESKTOP_DISABLE_PROTOCOL_REGISTRATION !== "1")
    app.setAsDefaultProtocolClient("houshiar")
  const runFork = Effect.runForkWith(yield* Effect.context())
  setProtocolReporter((level, message, data) =>
    runFork(scoped("protocol", level === "error" ? Effect.logError(message, data) : Effect.logWarning(message, data))),
  )
  registerRendererProtocol(paths.rendererRoot)
  setDockIcon(path, paths)
  applySpellcheck()
})

export const loadProxyEnvironment = Effect.gen(function* () {
  yield* Effect.try(() => {
    // A GUI-launched process inherits no shell environment, so a system-configured VPN or proxy
    // would otherwise be invisible. Discovery fills the standard variables before the background
    // service is spawned and inherits them, and before Node's http module picks them up below.
    // Explicit environment variables always win over the OS settings.
    const systemProxy = discoverSystemProxy()
    if (systemProxy) {
      if (systemProxy.http && !process.env.HTTP_PROXY && !process.env.http_proxy) process.env.HTTP_PROXY = systemProxy.http
      if (systemProxy.https && !process.env.HTTPS_PROXY && !process.env.https_proxy) process.env.HTTPS_PROXY = systemProxy.https
      if (systemProxy.noProxy) mergeNoProxy(systemProxy.noProxy)
    }
    ensureLoopbackNoProxy()
    // SAFETY: Electron 41.2 ships a Node with http.setGlobalProxyFromEnv, which the current @types/node lacks.
    const proxyAwareHttp = http as typeof http & { setGlobalProxyFromEnv(): void }
    proxyAwareHttp.setGlobalProxyFromEnv()
  }).pipe(Effect.catch((error) => Effect.logWarning("failed to load proxy environment", { error })))
})

const loadSystemCertificates = Effect.try({
  try: () => {
    setDefaultCACertificates([...new Set([...getCACertificates("default"), ...getCACertificates("system")])])
  },
  catch: (error) => error,
}).pipe(Effect.catch((error) => Effect.logWarning("failed to load system certificates", { error })))

// Bun reads lowercase `no_proxy` alone whenever it is set, so both spellings get the same merged list.
function ensureLoopbackNoProxy() {
  mergeNoProxy("127.0.0.1,localhost,::1")
}

function mergeNoProxy(entries: string) {
  const noProxy = [
    ...new Set(
      [process.env.NO_PROXY, process.env.no_proxy, entries].flatMap((value) =>
        (value ?? "").split(",").flatMap((entry) => entry.trim() || []),
      ),
    ),
  ].join(",")

  process.env.NO_PROXY = noProxy
  process.env.no_proxy = noProxy
}
