import { GH_HEADERS } from "@/lib/pipeline/scan/github"

/**
 * Rate-limited GitHub file/directory reads for enrichment. Reuses the scanner's
 * authenticated headers (single token, no duplication).
 *
 * Fail-closed contract: a definitive 404 returns null / [] ("confirmed absent"),
 * but a network error, a 5xx, or a 403 that survives one retry THROWS - so the
 * enricher can hold a repo back rather than publish it as if it had no manifest.
 */

export type RepoRef = { owner: string; repo: string }
export type DirEntry = { name: string; path: string; type: "file" | "dir" }

// ~70 calls/min stays comfortably under GitHub's 5000/h authenticated limit.
const MIN_INTERVAL_MS = 860
let lastCallAt = 0

async function rateWait(): Promise<void> {
  const since = Date.now() - lastCallAt
  if (since < MIN_INTERVAL_MS) await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - since))
  lastCallAt = Date.now()
}

async function ghGet(url: string): Promise<Response> {
  await rateWait()
  return fetch(url, { headers: GH_HEADERS, signal: AbortSignal.timeout(20_000), cache: "no-store" })
}

function contentsUrl(ref: RepoRef, path: string): string {
  return `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents/${path}`
}

/** UTF-8 file content, or null if the path is a definitive 404 / not a file. Throws on uncertainty. */
export async function readRepoFile(ref: RepoRef, path: string, retryOn403 = true): Promise<string | null> {
  const res = await ghGet(contentsUrl(ref, path))
  if (res.status === 404) return null
  if (res.status === 403 && retryOn403) {
    const reset = Number(res.headers.get("x-ratelimit-reset"))
    const waitMs = reset ? Math.max(0, reset * 1000 - Date.now()) + 2000 : 60_000
    await new Promise((r) => setTimeout(r, Math.min(waitMs, 90_000)))
    return readRepoFile(ref, path, false)
  }
  if (!res.ok) throw new Error(`GitHub contents ${res.status} for ${ref.owner}/${ref.repo}/${path}`)
  const data = (await res.json()) as { type?: string; content?: string; encoding?: string }
  if (data.type !== "file" || typeof data.content !== "string") return null
  return Buffer.from(data.content, (data.encoding as BufferEncoding) ?? "base64").toString("utf-8")
}

/** Directory entries, or [] if the path is a definitive 404. Throws on uncertainty. */
export async function listRepoDir(ref: RepoRef, path: string, retryOn403 = true): Promise<DirEntry[]> {
  const res = await ghGet(contentsUrl(ref, path))
  if (res.status === 404) return []
  if (res.status === 403 && retryOn403) {
    const reset = Number(res.headers.get("x-ratelimit-reset"))
    const waitMs = reset ? Math.max(0, reset * 1000 - Date.now()) + 2000 : 60_000
    await new Promise((r) => setTimeout(r, Math.min(waitMs, 90_000)))
    return listRepoDir(ref, path, false)
  }
  if (!res.ok) throw new Error(`GitHub contents ${res.status} for ${ref.owner}/${ref.repo}/${path}`)
  const data = await res.json()
  if (!Array.isArray(data)) return []
  return data
    .filter((e): e is { name: string; path: string; type: string } => !!e && typeof e.name === "string")
    .map((e) => ({ name: e.name, path: e.path, type: e.type === "dir" ? "dir" : "file" }))
}

/** Parse an "owner/repo" ref from a github.com URL. */
export function parseRepoRef(url: string): RepoRef | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/#?]+)/)
  return m ? { owner: m[1], repo: m[2].replace(/\.git$/, "") } : null
}
