import { spawnSync } from "node:child_process"

export * as ProxyDiscovery from "./proxy-discovery.js"

const TIMEOUT = 3_000

export type Proxy = {
  /** Proxy URL for plain `http:` requests, with scheme `http://` or `https://`. */
  readonly http?: string
  /** Proxy URL for `https:` requests, with scheme `http://` or `https://`. */
  readonly https?: string
  /** Hosts that must bypass the proxy, as a comma-separated list. */
  readonly noProxy?: string
}

const envProxy = (env: Record<string, string | undefined>) =>
  env.HTTP_PROXY ?? env.http_proxy ?? env.HTTPS_PROXY ?? env.https_proxy ?? env.ALL_PROXY ?? env.all_proxy

/**
 * Discovers an OS-configured proxy so processes that inherit no proxy environment (a GUI-launched
 * service, a non-login shell) can still route outbound requests through it. Explicit environment
 * variables always win: when any is set the OS is not consulted, so a user-configured environment
 * keeps full control.
 */
export function discoverSystemProxy(
  platform: NodeJS.Platform = process.platform,
  env: Record<string, string | undefined> = process.env,
): Proxy | undefined {
  if (envProxy(env)) return undefined
  if (platform === "darwin") return macOSProxy()
  if (platform === "win32") return windowsProxy()
  if (platform === "linux") return linuxProxy()
  return undefined
}

// macOS System Settings network proxies. `scutil --proxy` prints one `<key> : <value>` pair per line.
function macOSProxy(): Proxy | undefined {
  const out = run("scutil", ["--proxy"])
  if (!out) return undefined
  const values = new Map(
    out
      .split("\n")
      .map((line) => line.split(":"))
      .filter((parts) => parts.length === 2 && parts[1].trim() !== "")
      .map((parts) => [parts[0].trim(), parts[1].trim()]),
  )
  const url = (scheme: "http" | "https") => {
    if (values.get(`${scheme}Enable`) !== "1") return undefined
    const host = values.get(`${scheme}Proxy`)
    const port = values.get(`${scheme}Port`)
    if (!host || !port) return undefined
    return `http://${host}:${port}`
  }
  const http = url("http")
  const https = url("https")
  if (!http && !https) return undefined
  const exceptions = values.get("ExceptionsList")
  const noProxy = exceptions
    ?.split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(",")
  return { ...(http ? { http } : {}), ...(https ? { https } : {}), ...(noProxy ? { noProxy } : {}) }
}

const WININET_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"

// Windows WinINET proxy settings, per-user. ProxyEnable is a REG_DWORD; ProxyServer is either a
// single `host:port` for every scheme or `scheme=host:port;...` pairs.
function windowsProxy(): Proxy | undefined {
  const settings = run("reg", ["query", WININET_KEY])
  if (!settings || !/ProxyEnable\s+0x1\b/.test(settings)) return undefined
  const match = settings.match(/ProxyServer\s+REG_SZ\s+(.+)/)
  if (!match) return undefined
  const value = match[1].trim()
  if (!value.includes("=")) {
    const url = `http://${value}`
    return { http: url, https: url }
  }
  const proxies = new Map(
    value
      .split(";")
      .map((entry) => entry.split("="))
      .filter((parts) => parts.length === 2)
      .map((parts) => [parts[0].trim().toLowerCase(), parts[1].trim()]),
  )
  const http = proxies.get("http")
  const https = proxies.get("https")
  if (!http && !https) return undefined
  return {
    ...(http ? { http: `http://${http}` } : {}),
    ...(https ? { https: `http://${https}` } : {}),
  }
}

// Linux desktop proxy (GNOME and derivatives share org.gnome.system.proxy). Environment variables
// cover servers and headless machines; gsettings covers the GUI case.
function linuxProxy(): Proxy | undefined {
  const mode = run("gsettings", ["get", "org.gnome.system.proxy", "mode"])
  if (!mode || !mode.includes("'manual'")) return undefined
  const scheme = (name: "http" | "https") => {
    const host = run("gsettings", ["get", `org.gnome.system.proxy.${name}`, "host"])?.replace(/'/g, "").trim()
    const port = run("gsettings", ["get", `org.gnome.system.proxy.${name}`, "port"])?.replace(/'/g, "").trim()
    if (!host || !port) return undefined
    return `http://${host}:${port}`
  }
  const http = scheme("http")
  const https = scheme("https")
  if (!http && !https) return undefined
  const ignoreHosts = run("gsettings", ["get", "org.gnome.system.proxy", "ignore-hosts"])
  const noProxy = ignoreHosts
    ?.replace(/^\[|\]$/g, "")
    .split(",")
    .map((entry) => entry.trim().replace(/^'|'$/g, ""))
    .filter(Boolean)
    .join(",")
  return { ...(http ? { http } : {}), ...(https ? { https } : {}), ...(noProxy ? { noProxy } : {}) }
}

function run(command: string, args: string[]): string | undefined {
  try {
    const out = spawnSync(command, args, { encoding: "utf8", timeout: TIMEOUT, windowsHide: true })
    if (out.error || out.status !== 0 || typeof out.stdout !== "string") return undefined
    return out.stdout
  } catch {
    return undefined
  }
}
