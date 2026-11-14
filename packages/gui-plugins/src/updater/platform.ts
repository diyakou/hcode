import { app, autoUpdater, shell } from "electron"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import pkg from "electron-updater"
import { Effect } from "effect"
import type { Platform } from "./machine"

const updateClient = pkg.autoUpdater

const execFileAsync = promisify(execFile)

const restartTimeout = 10_000

const unpackTimeout = 120_000

export const make = Effect.fn("Updater.platform")(function* (channel: string) {
  const userAgent = `houshiar/${channel === "prod" ? "latest" : channel}/${app.getVersion()}/desktop`
  const runFork = Effect.runForkWith(yield* Effect.context())
  updateClient.logger = {
    info: (...args) => runFork(Effect.logInfo(...args)),
    warn: (...args) => runFork(Effect.logWarning(...args)),
    error: (...args) => runFork(Effect.logError(...args)),
    debug: (...args) => runFork(Effect.logDebug(...args)),
  }
  updateClient.setFeedURL({
    provider: "generic",
    url:
      channel === "beta"
        ? "https://github.com/diyakou/hcode/releases/download/beta/"
        : "https://github.com/diyakou/hcode/releases/latest/download/",
  })
  updateClient.channel = channel === "beta" ? "beta" : "latest"
  updateClient.requestHeaders = { "User-Agent": userAgent }
  updateClient.allowPrerelease = false
  updateClient.allowDowngrade = true
  updateClient.autoDownload = false
  updateClient.autoInstallOnAppQuit = false
  yield* Effect.logInfo("auto updater configured", {
    channel: updateClient.channel,
    allowPrerelease: updateClient.allowPrerelease,
    allowDowngrade: updateClient.allowDowngrade,
    currentVersion: app.getVersion(),
  })

  return {
    checkForUpdate: Effect.tryPromise({
      try: async () => {
        const result = await updateClient.checkForUpdates()

        if (!result?.isUpdateAvailable) return undefined
        return {
          mode: "external",
          version: result.updateInfo.version,
          url:
            channel === "beta"
              ? `https://github.com/diyakou/hcode/releases/tag/v${result.updateInfo.version}`
              : "https://github.com/diyakou/hcode/releases/latest",
        } as const
      },
      catch: (error) => error,
    }),
    externalInstall: (url) => Effect.tryPromise({ try: () => shell.openExternal(url), catch: (error) => error }),
    stageUpdate,
    installAndRestart,
  } satisfies Platform
})

function stageUpdate(options: { readonly differential: boolean }) {
  if (process.platform !== "darwin")
    return Effect.tryPromise({
      try: () => {
        updateClient.disableDifferentialDownload =
          process.platform === "win32" && (!options.differential || app.runningUnderARM64Translation)

        return updateClient.downloadUpdate()
      },
      catch: (error) => error,
    }).pipe(Effect.flatMap(unpackInstaller))

  return Effect.callback<void, Error>((resume) => {
    const cleanup = () => {
      autoUpdater.removeListener("update-downloaded", complete)
      updateClient.removeListener("error", fail)
    }

    const complete = () => {
      cleanup()
      resume(Effect.void)
    }

    const fail = (error: Error) => {
      cleanup()
      resume(Effect.fail(error))
    }

    autoUpdater.once("update-downloaded", complete)
    updateClient.once("error", fail)
    void updateClient.downloadUpdate().catch(fail)

    return Effect.sync(cleanup)
  })
}

function unpackInstaller(files: string[]) {
  const installer = files.find((file) => file.endsWith(".exe"))

  if (process.platform !== "win32" || !app.isPackaged || !installer) return Effect.void

  return Effect.tryPromise(() =>
    execFileAsync(installer, ["--stage"], { windowsHide: true, timeout: unpackTimeout }),
  ).pipe(
    Effect.andThen(Effect.logInfo("update unpacked before restart", { installer })),
    Effect.catch((error) =>
      Effect.logWarning("update not unpacked before restart", {
        installer,
        message: error.cause instanceof Error ? error.cause.message : String(error.cause),
      }),
    ),
  )
}

const installAndRestart = Effect.callback<void, Error>((resume) => {
  const cleanup = () => {
    autoUpdater.removeListener("before-quit-for-update", started)
    updateClient.removeListener("error", fail)
  }

  const started = () => {
    cleanup()
    resume(Effect.void)
  }

  const fail = (error: Error) => {
    cleanup()
    resume(Effect.fail(error))
  }

  autoUpdater.once("before-quit-for-update", started)
  updateClient.once("error", fail)

  try {
    updateClient.quitAndInstall()
  } catch (error) {
    fail(error instanceof Error ? error : new Error(String(error)))
  }

  return Effect.sync(cleanup)
}).pipe(
  Effect.timeoutOrElse({
    duration: restartTimeout,
    orElse: () =>
      Effect.logError("update restart did not start").pipe(
        Effect.andThen(Effect.fail(new Error("Update restart did not start"))),
      ),
  }),
)