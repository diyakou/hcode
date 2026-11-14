import { spawnSync } from "node:child_process"

export * as ProxyDiscovery from "./proxy-discovery.js"

const TIMEOUT = 3_000
const TUNNEL_PROBE_TIMEOUT = 3_000

export type Proxy = {
  /** Proxy URL for plain `http:` requests, with scheme `http://` or `https://. */
  readonly http?: string
  /** Proxy URL for `https:` requests, with scheme `http://` or `https://. */
  readonly https?: string
  /** Hosts that must bypass the proxy, as a comma-separated list. */
  readonly noProxy?: string
}

const envProxy = (env: Record<string, string | undefined>) =>
  env.HTTP_PROXY ?? env.http_proxy ?? env.HTTPS_PROXY ?? env.https_proxy ?? env.ALL_PROXY ?? env.all_proxy

/**
 * Discovers a proxy or VPN the machine can route through, so processes that inherit no proxy
 * environment (a GUI-launched service, a non-login shell) can still reach blocked hosts.
 * Precedence: explicit environment variables, then a user-configured override, then OS proxy
 * settings, then a local VPN app's mixed SOCKS/HTTP port probed live. Returns `undefined` when
 * nothing usable is found, leaving outbound traffic untouched.
 */
export function discoverSystemProxy(
  platform: NodeJS.Platform = process.platform,
  env: Record<string, string | undefined> = process.env,
): Proxy | undefined {
  if (envProxy(env)) return undefined
  const override = configuredProxy(env)
  if (override) return override
  if (platform === "darwin") return macOSProxy() ?? vpnAppProxy()
  if (platform === "win32") return windowsProxy()
  if (platform === "linux") return linuxProxy() ?? vpnAppProxy()
  return undefined
}

// `OPENCODE_PROXY` is a fixed manual override for machines where discovery cannot find the tunnel
// (an unsupported VPN app, or a split-tunnel setup). A full URL is accepted; a bare `host:port`
// is treated as an HTTP proxy.
function configuredProxy(env: Record<string, string | undefined>): Proxy | undefined {
  const value = env.OPENCODE_PROXY?.trim()
  if (!value) return undefined
  const url = value.includes("://") ? value : `http://${value}`
  return { http: url, https: url }
}

// Tunnel apps run a Network Extension (macOS PacketTunnel / sing-box / v2ray / ...) that listens on
// a random loopback port serving both SOCKS and HTTP CONNECT. The port changes on every reconnect,
// so listeners owned by known tunnel executables are probed live: the one whose egress differs from
// the direct connection routes traffic through the tunnel; direct-bound listeners never match.
function vpnAppProxy(): Proxy | undefined {
  const ports = tunnelListenerPorts()
  for (const port of ports) {
    const url = `http://127.0.0.1:${port}`
    if (probesTunnel(url)) return { http: url, https: url }
  }
  return undefined
}

function tunnelListenerPorts(): number[] {
  // -F pcf formats one listener per block: `p<pid>`, `c<command>`, then `n<addr>` lines.
  const out = run("lsof", ["-iTCP", "-sTCP:LISTEN", "-P", "-n", "-Fpcn"])
  if (!out) return []
  const ports = new Map<number, string>()
  let command: string | undefined
  for (const line of out.split("\n")) {
    const tag = line[0]
    const value = line.slice(1)
    if (tag === "c") command = value
    if (tag === "n" && command && isTunnelCommand(command)) {
      const port = Number(value.split(":").pop())
      if (Number.isInteger(port) && port > 0 && value.startsWith("127.0.0.1")) ports.set(port, command)
    }
  }
  return [...ports.keys()]
}

const TUNNEL_COMMANDS = [
  "packettunnel", // macOS VPN network extensions (V2Box, Shadowrocket, Passepartout, sing-box apps)
  "sing-box",
  "v2ray",
  "xray",
  "clash",
  "mihomo",
  "tun2socks",
  "leaf",
  "v2box",
  "shadowrocket",
  "passepartout",
  "nekoray",
  "hiddify",
]

function isTunnelCommand(command: string) {
  const name = command.split("/").pop() ?? command
  return TUNNEL_COMMANDS.some((tunnel) => name.toLowerCase().includes(tunnel))
}

// A real CONNECT round trip is the only reliable tunnel/direct test: direct listeners also answer
// CONNECT, but their egress keeps the country the direct connection sees. `curl` ships with every
// supported platform; an unavailable binary simply skips the probe.
function probesTunnel(proxyUrl: string): boolean {
  const out = spawnSync(
    "curl",
    [
      "-s",
      "--max-time",
      String(TUNNEL_PROBE_TIMEOUT / 1000),
      "-x",
      proxyUrl,
      "https://cloudflare.com/cdn-cgi/trace",
    ],
    { encoding: "utf8", timeout: TUNNEL_PROBE_TIMEOUT + 500, windowsHide: true },
  )
  if (out.error || out.status !== 0 || typeof out.stdout !== "string") return false
  const direct = directTrace()
  if (!direct) return false
  const proxied = out.stdout.match(/^loc=(\S+)$/m)?.[1]
  // No `loc=` means the proxy failed the request; a matching country means it egresses directly.
  return proxied !== undefined && proxied !== direct
}

// The direct egress country, cached for one process so multiple probes compare against one value.
// `undefined` means not yet probed; `null` means probed and unavailable.
let directCountry: string | null | undefined
function directTrace(): string | undefined {
  if (directCountry !== undefined) return directCountry ?? undefined
  const out = spawnSync(
    "curl",
    ["-s", "--max-time", String(TUNNEL_PROBE_TIMEOUT / 1000), "https://cloudflare.com/cdn-cgi/trace"],
    { encoding: "utf8", timeout: TUNNEL_PROBE_TIMEOUT + 500, windowsHide: true },
  )
  directCountry = out.error || out.status !== 0 ? null : (out.stdout.match(/^loc=(\S+)$/m)?.[1] ?? null)
  return directCountry ?? undefined
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
