import type { Collector, Candidate } from "./types"
import type { ContentType } from "@/lib/admin/types"
import type { PipelineReport } from "@/lib/admin/pipeline-runs"
import { heartbeat } from "@/lib/admin/pipeline-runs"
import { loadBlocklist, isBlocked, blockUrl, normalizeUrl, type Blocklist } from "@/lib/admin/lists"
import { publishedHrefSet, publishBatch, removeExpired } from "./store"

const CONTENT_TYPES: ContentType[] = ["jobs", "oss", "grants", "pulse", "events", "companies", "portals", "news"]
const EXPIRING_TYPES: ContentType[] = ["jobs", "events"]

// Deterministic spam markers; matches here are rejected and blocklisted without
// spending a DeepSeek call. The DeepSeek reviewer (later) handles subtler cases.
const SPAM_RE = /\b(casino|porn|viagra|essay writing|forex signals|crypto pump|buy followers)\b/i

function emptyReport(): PipelineReport {
  return {
    added: {}, removed: {}, scanned: 0, blocked: 0, verified: 0,
    reviewed: 0, published: 0, skipped: 0, errors: [], notes: [], perSource: {},
  }
}

function candidateHref(c: Candidate): string {
  return String((c.extracted as Record<string, unknown>)?.href ?? c.sourceUrl ?? "")
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function toPublished(type: ContentType, c: Candidate, today: string, expiresAt: string): Record<string, unknown> {
  const data: Record<string, unknown> = { ...c.extracted, checkedAt: today }
  if (type === "jobs" && !data.expiresAt) data.expiresAt = expiresAt
  if (type === "companies" && !data.slug && data.name) data.slug = slugify(String(data.name))
  return data
}

/** HTTP liveness check. Returns the set of candidate hrefs that are dead. */
async function findDeadUrls(urls: string[]): Promise<Set<string>> {
  const dead = new Set<string>()
  const BATCH = 8
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (url) => {
        if (!url.startsWith("http")) { dead.add(url); return }
        try {
          let res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "osspath.com/pipeline 1.0" } })
          if (res.status === 405) {
            res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "osspath.com/pipeline 1.0" } })
          }
          if (!res.ok) dead.add(url)
        } catch { dead.add(url) }
      }),
    )
    if (i + BATCH < urls.length) await new Promise((r) => setTimeout(r, 250))
  }
  return dead
}

/**
 * Run the full pipeline for a held run. Processes everything in memory and
 * publishes once. Returns the report and whether the published dataset changed
 * (dirty), which the caller uses to decide whether to trigger a rebuild.
 */
export async function runPipeline(
  runId: string,
  collectors: Collector[],
): Promise<{ report: PipelineReport; dirty: boolean }> {
  const report = emptyReport()
  const today = new Date().toISOString().slice(0, 10)
  const expiry = new Date()
  expiry.setMonth(expiry.getMonth() + 3)
  const expiresAt = expiry.toISOString().slice(0, 10)
  let dirty = false

  // ── Phase 0: cleanup — remove expired jobs/events ──────────────────────────
  for (const type of EXPIRING_TYPES) {
    try {
      const removed = await removeExpired(type, today)
      if (removed > 0) { report.removed[type] = removed; dirty = true }
    } catch (e) {
      report.errors.push(`cleanup ${type}: ${String(e)}`)
    }
  }
  await heartbeat(runId)

  // ── Phase 1: scan — collect candidates, drop blocklisted ───────────────────
  const blocklist: Blocklist = await loadBlocklist()
  const candidates: Candidate[] = []
  for (const collect of collectors) {
    try {
      const { log, items } = await collect()
      report.scanned += items.length
      report.perSource![log.source] = (report.perSource![log.source] ?? 0) + items.length
      for (const it of items) {
        if (isBlocked(blocklist, { url: candidateHref(it), text: it.rawText })) { report.blocked++; continue }
        candidates.push(it)
      }
      if (log.errors?.length) report.errors.push(...log.errors.map((e) => `${log.source}: ${e}`))
    } catch (e) {
      report.errors.push(`scan: ${String(e)}`)
    }
  }
  await heartbeat(runId)

  // ── Phase 2: dedup against already-published content ───────────────────────
  const publishedByType = new Map<ContentType, Set<string>>()
  for (const type of CONTENT_TYPES) publishedByType.set(type, await publishedHrefSet(type))
  const fresh = candidates.filter((c) => {
    const set = publishedByType.get(c.type)
    if (!set) return true
    const href = normalizeUrl(candidateHref(c))
    if (href && set.has(href)) { report.skipped++; return false }
    return true
  })
  await heartbeat(runId)

  // ── Phase 3: verify — drop dead links ──────────────────────────────────────
  const dead = await findDeadUrls(fresh.map(candidateHref))
  const live = fresh.filter((c) => !dead.has(candidateHref(c)))
  report.verified = live.length
  await heartbeat(runId)

  // ── Phase 4: review — deterministic quality gate + auto-blocklist spam ─────
  const accepted: Candidate[] = []
  for (const c of live) {
    const href = candidateHref(c)
    const text = `${c.rawText ?? ""} ${JSON.stringify(c.extracted)}`
    if (SPAM_RE.test(text)) {
      report.skipped++
      try { await blockUrl(href, "reviewer: spam heuristic") } catch { /* best effort */ }
      continue
    }
    accepted.push(c)
  }
  report.reviewed = accepted.length
  await heartbeat(runId)

  // ── Phase 5: publish once ──────────────────────────────────────────────────
  const byType = new Map<ContentType, Record<string, unknown>[]>()
  for (const c of accepted) {
    const list = byType.get(c.type) ?? []
    list.push(toPublished(c.type, c, today, expiresAt))
    byType.set(c.type, list)
  }
  for (const [type, items] of byType) {
    try {
      const n = await publishBatch(type, items)
      if (n > 0) { report.added[type] = (report.added[type] ?? 0) + n; report.published += n; dirty = true }
    } catch (e) {
      report.errors.push(`publish ${type}: ${String(e)}`)
    }
  }
  await heartbeat(runId)

  return { report, dirty }
}
