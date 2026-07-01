"use server"

import { addPendingItems, readPending, writePending, readContent } from "./storage"
import { extractWithDeepSeek } from "./deepseek"
import type { ScanLog, ContentType } from "./types"
import { collectGrants } from "@/lib/pipeline/scan/grants"
import { collectReddit } from "@/lib/pipeline/scan/reddit"
import { collectGitHubOSS } from "@/lib/pipeline/scan/github-oss"
import { collectRustBytes } from "@/lib/pipeline/scan/rust-bytes"
import { collectPulse } from "@/lib/pipeline/scan/pulse"
import { collectCompanies } from "@/lib/pipeline/scan/companies"
import { collectEvents } from "@/lib/pipeline/scan/events"
import { collectPortals } from "@/lib/pipeline/scan/portals"
import { collectHN } from "@/lib/pipeline/scan/hn"
import { collectCareers } from "@/lib/pipeline/scan/careers"
import { collectTWIR } from "@/lib/pipeline/scan/twir"
import { sleep, stripHtml } from "@/lib/pipeline/scan/shared"
import { auth } from "@/lib/auth"

async function requireAdmin() {
  const session = await auth()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || session?.user?.email !== adminEmail) {
    throw new Error("Unauthorized")
  }
}

// ── HN Who Is Hiring ──────────────────────────────────────────────────────────

// Legacy wrapper: delegates to the shared core and persists to admin_queue.
export async function scanHNHiring(): Promise<ScanLog> {
  await requireAdmin()
  const publishedHrefs = new Set((await readContent("jobs")).map(i => String(i.href ?? "")))
  const { log, items } = await collectHN({ isKnown: (href) => publishedHrefs.has(href) })
  log.added = await addPendingItems("jobs", items)
  log.skipped = log.found - log.added
  return log
}

// ── TWIR Scanner ──────────────────────────────────────────────────────────────

// Legacy wrapper: delegates to the shared core and persists per type.
export async function scanTWIR(): Promise<ScanLog> {
  await requireAdmin()
  const known = new Set<string>()
  for (const t of ["oss", "events", "news", "jobs"] as const) {
    for (const i of await readContent(t)) { const h = String(i.href ?? ""); if (h) known.add(h) }
  }
  const { log, items } = await collectTWIR({ isKnown: (href) => known.has(href) })
  for (const t of ["jobs", "oss", "events", "news"] as const) {
    log.added += await addPendingItems(t, items.filter(i => i.type === t))
  }
  log.skipped = log.found - log.added
  return log
}

// ── GitHub OSS Scanner (metadata-first, no AI required) ──────────────────────

export async function scanGitHubOSS(): Promise<ScanLog> {
  await requireAdmin()
  const publishedHrefs = new Set((await readContent("oss")).map(i => String(i.href ?? "")))
  const { log, items } = await collectGitHubOSS({ isKnown: (href) => publishedHrefs.has(href) })
  log.added = await addPendingItems("oss", items)
  return log
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Grants Scanner ────────────────────────────────────────────────────────────

// Legacy wrapper: delegates to the shared core and persists to admin_queue for
// the old scan panel. Kept only until the panel is removed in Stage 4.
export async function scanGrants(): Promise<ScanLog> {
  await requireAdmin()
  const publishedHrefs = new Set((await readContent("grants")).map(i => String(i.href ?? "")))
  const { log, items } = await collectGrants({ isKnown: (href) => publishedHrefs.has(href) })
  log.added = await addPendingItems("grants", items)
  return log
}

// ── Pulse Scanner ─────────────────────────────────────────────────────────────

export async function scanPulse(): Promise<ScanLog> {
  await requireAdmin()
  const publishedHrefs = new Set((await readContent("pulse")).map(i => String(i.href ?? "")))
  const { log, items } = await collectPulse({ isKnown: (href) => publishedHrefs.has(href) })
  log.added = await addPendingItems("pulse", items)
  return log
}

// ── Events Scanner ────────────────────────────────────────────────────────────

// Legacy wrapper: delegates to the shared core and persists to admin_queue.
export async function scanEvents(): Promise<ScanLog> {
  await requireAdmin()
  const publishedHrefs = new Set((await readContent("events")).map(i => String(i.href ?? "")))
  const { log, items } = await collectEvents({ isKnown: (href) => publishedHrefs.has(href) })
  log.added = await addPendingItems("events", items)
  return log
}

// ── Portals Scanner ───────────────────────────────────────────────────────────

// Legacy wrapper: delegates to the shared core and persists to admin_queue.
export async function scanPortals(): Promise<ScanLog> {
  await requireAdmin()
  const publishedHrefs = new Set((await readContent("portals")).map(i => String(i.href ?? "")))
  const { log, items } = await collectPortals({ isKnown: (href) => publishedHrefs.has(href) })
  log.added = await addPendingItems("portals", items)
  return log
}

// ── Companies Scanner ─────────────────────────────────────────────────────────

// Legacy wrapper: delegates to the shared core and persists to admin_queue.
export async function scanCompanies(): Promise<ScanLog> {
  await requireAdmin()
  const publishedHrefs = new Set((await readContent("companies")).map(i => String(i.href ?? "")))
  const { log, items } = await collectCompanies({ isKnown: (href) => publishedHrefs.has(href) })
  log.added = await addPendingItems("companies", items)
  return log
}

// ── Rust Bytes newsletter scanner ─────────────────────────────────────────────

// Legacy wrapper: delegates to the shared core and persists to admin_queue.
export async function scanRustBytes(): Promise<ScanLog> {
  await requireAdmin()
  const publishedHrefs = new Set((await readContent("oss")).map(i => String(i.href ?? "")))
  const { log, items } = await collectRustBytes({ isKnown: (href) => publishedHrefs.has(href) })
  log.added = await addPendingItems("oss", items)
  return log
}

// ── Company Careers Scanner (Greenhouse + Lever public APIs) ──────────────────

// Legacy wrapper: delegates to the shared core and persists to admin_queue.
export async function scanCompanyCareers(): Promise<ScanLog> {
  await requireAdmin()
  const publishedHrefs = new Set((await readContent("jobs")).map(i => String(i.href ?? "")))
  const { log, items } = await collectCareers({ isKnown: (href) => publishedHrefs.has(href) })
  log.added = await addPendingItems("jobs", items)
  log.skipped = log.found - log.added
  return log
}

// ── Reddit r/rust Scanner ─────────────────────────────────────────────────────

// Legacy wrapper: delegates to the shared core and persists to admin_queue for
// the old scan panel. Kept only until the panel is removed in Stage 4.
export async function scanRedditRust(): Promise<ScanLog> {
  await requireAdmin()
  const { log, items } = await collectReddit({ isKnown: () => false })
  const jobs = items.filter(i => i.type === "jobs")
  const news = items.filter(i => i.type === "news")
  log.added = (await addPendingItems("jobs", jobs)) + (await addPendingItems("news", news))
  log.skipped = log.found - log.added
  return log
}

// ── Queue Verifier ────────────────────────────────────────────────────────────
// Fetches the live URL of every pending item for a given type, checks it is
// still alive and mentions Rust, and optionally re-extracts fields via AI.

export async function scanVerifyQueue(type: ContentType): Promise<ScanLog> {
  await requireAdmin()
  const log: ScanLog = {
    source: `verify-${type}`,
    startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }

  const pending = await readPending(type)
  log.found = pending.length

  if (pending.length === 0) {
    log.notes!.push(`No pending ${type} items to verify.`)
    log.finishedAt = new Date().toISOString()
    return log
  }

  const useAI = !!process.env.DEEPSEEK_API_KEY
  let confirmed = 0, dead = 0, enriched = 0, skipped = 0
  const deadItems: import("./types").DeadItem[] = []

  const BATCH = 8
  const updated = [...pending]

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(async (item) => {
        const url = String(item.extracted?.href ?? item.sourceUrl ?? "")
        if (!url.startsWith("http")) return { item, status: "skipped" as const }

        try {
          const res = await fetch(url, {
            method: "GET",
            signal: AbortSignal.timeout(9_000),
            headers: { "User-Agent": "osspath.com/verifier 1.0" },
            next: { revalidate: 0 },
          })

          if (!res.ok) {
            return {
              item: {
                ...item,
                extracted: {
                  ...item.extracted,
                  _verified: false,
                  _httpStatus: res.status,
                  _verifiedAt: new Date().toISOString(),
                },
              },
              status: "dead" as const,
            }
          }

          const rawHtml = await res.text()
          const pageText = stripHtml(rawHtml)
          const hasRust = /\brust\b/i.test(pageText.slice(0, 20_000))

          const patch: Record<string, unknown> = {
            _verified: hasRust,
            _httpStatus: res.status,
            _verifiedAt: new Date().toISOString(),
          }
          let aiEnriched = false

          if (useAI && hasRust) {
            const snippet = pageText.slice(0, 3_500)
            const result = await extractWithDeepSeek(type, snippet)
            if (result.ok && result.data) {
              // Only fill in fields that are currently blank
              for (const [k, v] of Object.entries(result.data)) {
                if (k.startsWith("_")) continue
                const cur = item.extracted[k]
                if ((!cur || cur === "" || cur === 0) && v) patch[k] = v
              }
              aiEnriched = true
            }
          }

          return {
            item: {
              ...item,
              confidence: hasRust
                ? Math.max(item.confidence ?? 0, 0.65)
                : (item.confidence ?? 0.5) * 0.4,
              extracted: { ...item.extracted, ...patch },
            },
            status: (hasRust ? "confirmed" : "dead") as "confirmed" | "dead",
            aiEnriched,
          }
        } catch {
          return { item, status: "skipped" as const }
        }
      })
    )

    for (let j = 0; j < results.length; j++) {
      const { item: updatedItem, status, aiEnriched } = results[j] as {
        item: typeof pending[0]; status: string; aiEnriched?: boolean
      }
      updated[i + j] = updatedItem
      if (status === "confirmed") confirmed++
      else if (status === "dead") {
        dead++
        const e = updatedItem.extracted as Record<string, unknown>
        deadItems.push({
          id: updatedItem.id,
          label: String(e.name ?? e.title ?? e.role ?? updatedItem.sourceUrl ?? updatedItem.id),
          href: String(e.href ?? updatedItem.sourceUrl ?? ""),
          httpStatus: e._httpStatus as number | undefined,
        })
      }
      else skipped++
      if (aiEnriched) enriched++
    }

    if (i + BATCH < pending.length) await sleep(300)
  }

  await writePending(type, updated)

  log.added = confirmed
  log.skipped = dead + skipped
  log.stages!.totalChecked = pending.length
  log.stages!.confirmed = confirmed
  log.stages!.deadOrMoved = dead
  log.stages!.unreachable = skipped
  if (useAI) log.stages!.enrichedWithAI = enriched
  if (dead > 0) {
    log.notes!.push(`${dead} dead links — use "Reject dead" button below to remove them.`)
    log.deadItems = deadItems
  }
  if (enriched > 0) log.notes!.push(`${enriched} items enriched with fresh AI extraction from live page.`)

  log.finishedAt = new Date().toISOString()
  return log
}

// ── Verify Published ──────────────────────────────────────────────────────────
// Checks live URLs of already-published items. Dead links and expired entries
// are returned in log.deadItems so the panel can remove them in one click.

export async function scanVerifyPublished(type: ContentType): Promise<ScanLog> {
  "use server"
  const log: ScanLog = {
    source: `verify-published-${type}`,
    startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0,
    errors: [], stages: {}, notes: [], deadItems: [],
  }

  const { readContent } = await import("./storage")
  const items = await readContent(type)
  log.found = items.length

  if (items.length === 0) {
    log.notes!.push(`No published ${type} items to verify.`)
    log.finishedAt = new Date().toISOString()
    return log
  }

  const today = new Date().toISOString().slice(0, 10)
  let dead = 0, expired = 0, ok = 0

  // ── 1. Date-expiry check (free, instant) ─────────────────────────────────
  if (type === "jobs" || type === "events") {
    for (const item of items) {
      const exp = String(item.expiresAt ?? "")
      if (exp && exp < today) {
        expired++
        log.deadItems!.push({
          id: String(item.href ?? ""),
          label: String(item.name ?? item.title ?? item.role ?? item.href ?? "?"),
          href: String(item.href ?? ""),
          httpStatus: undefined,
        })
      }
    }
    log.stages!.expired = expired
    if (expired > 0) log.notes!.push(`${expired} expired ${type} (past expiresAt date).`)
  }

  // ── 2. HTTP liveness check ────────────────────────────────────────────────
  const toCheck = items.filter(item => {
    const href = String(item.href ?? "")
    if (!href.startsWith("http")) return false
    // Skip items already flagged as expired above
    const exp = String(item.expiresAt ?? "")
    if ((type === "jobs" || type === "events") && exp && exp < today) return false
    return true
  })

  const BATCH = 8
  for (let i = 0; i < toCheck.length; i += BATCH) {
    const batch = toCheck.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(async (item) => {
        const url = String(item.href ?? "")
        try {
          const res = await fetch(url, {
            method: "HEAD",
            signal: AbortSignal.timeout(8_000),
            headers: { "User-Agent": "osspath.com/verifier 1.0" },
            next: { revalidate: 0 },
          })
          // Follow up with GET if HEAD not allowed
          if (res.status === 405) {
            const res2 = await fetch(url, {
              method: "GET",
              signal: AbortSignal.timeout(8_000),
              headers: { "User-Agent": "osspath.com/verifier 1.0" },
              next: { revalidate: 0 },
            })
            return { item, ok: res2.ok, status: res2.status }
          }
          return { item, ok: res.ok, status: res.status }
        } catch {
          return { item, ok: false, status: 0 }
        }
      })
    )

    for (const { item, ok: isOk, status } of results) {
      if (isOk) {
        ok++
      } else {
        dead++
        log.deadItems!.push({
          id: String(item.href ?? ""),
          label: String(item.name ?? item.title ?? item.role ?? item.href ?? "?"),
          href: String(item.href ?? ""),
          httpStatus: status || undefined,
        })
      }
    }

    if (i + BATCH < toCheck.length) await sleep(300)
  }

  log.added = ok
  log.skipped = dead
  log.stages!.totalChecked = items.length
  log.stages!.liveChecked = toCheck.length
  log.stages!.ok = ok
  log.stages!.deadLinks = dead

  const totalBad = dead + expired
  if (totalBad > 0) {
    log.notes!.push(`${totalBad} items to remove — use "Remove all" button below.`)
  } else {
    log.notes!.push(`All checked items are live.`)
  }

  log.finishedAt = new Date().toISOString()
  return log
}
