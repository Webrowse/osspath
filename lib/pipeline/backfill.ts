import { prisma } from "@/lib/prisma"
import { runEnrichment, enrichInputForRepo, parseRepoRef, ENRICHMENT_VERSION } from "./enrich"

/**
 * Tier 1 backfill: enrich existing repositories with the same enrichment
 * pipeline used at discovery, so the corpus is never permanently heterogeneous.
 *
 * State lives on each content_items row (data.enrichment), so backfill is
 * resumable (re-query the pending set) and idempotent (a current row is never
 * reselected, so re-runs write nothing and the snapshot does not churn). A repo
 * needs (re-)enrichment when its enrichment is missing, its version is behind,
 * or its source pushedAt changed upstream. A failed attempt is stamped so a
 * persistently failing repo backs off instead of blocking progress.
 */

const FAILURE_COOLDOWN_MS = 6 * 60 * 60 * 1000

type Data = Record<string, unknown>

/** Whether a repo record needs enrichment under the version + pushedAt gate. */
export function needsEnrichment(data: Data): boolean {
  const e = data.enrichment as { version?: number; sourcePushedAt?: string | null } | undefined
  if (!e || e.version !== ENRICHMENT_VERSION) return true
  const pushedAt = typeof data.pushedAt === "string" ? data.pushedAt : null
  return (e.sourcePushedAt ?? null) !== pushedAt
}

/** Whether a recently failed repo is still in its retry backoff window. */
export function inFailureCooldown(data: Data, now = Date.now()): boolean {
  const at = typeof data.enrichAttemptedAt === "string" ? Date.parse(data.enrichAttemptedAt) : NaN
  return !Number.isNaN(at) && now - at < FAILURE_COOLDOWN_MS
}

export type BackfillProgress = { total: number; enriched: number; remaining: number; version: number }

/** Corpus-wide enrichment progress at the current version. */
export async function enrichmentProgress(): Promise<BackfillProgress> {
  const rows = await prisma.contentItem.findMany({ where: { type: "oss" }, select: { data: true } })
  let enriched = 0
  for (const r of rows) if (!needsEnrichment(r.data as Data)) enriched++
  return { total: rows.length, enriched, remaining: rows.length - enriched, version: ENRICHMENT_VERSION }
}

export type BackfillResult = { processed: number; succeeded: number; failed: number; progress: BackfillProgress }

async function stampFailure(id: string, data: Data): Promise<void> {
  await prisma.contentItem.update({
    where: { id },
    data: { data: { ...data, enrichAttemptedAt: new Date().toISOString() } as never },
  })
}

/**
 * Enrich up to `batchSize` pending repos, in id order (deterministic, resumable).
 * Writes enrichment back to PostgreSQL. Reuses runEnrichment - no duplicated
 * logic. Callers hold the run lock so this cannot race a Refresh.
 */
export async function runBackfillBatch(batchSize: number, onRepo?: () => Promise<void>): Promise<BackfillResult> {
  const rows = await prisma.contentItem.findMany({ where: { type: "oss" }, orderBy: { id: "asc" } })
  const now = Date.now()
  const pending = rows
    .filter((r) => needsEnrichment(r.data as Data) && !inFailureCooldown(r.data as Data, now))
    .slice(0, batchSize)

  let succeeded = 0
  let failed = 0
  for (const row of pending) {
    await onRepo?.() // keep the run lock's heartbeat alive across a long batch
    const data = row.data as Data
    const ref = parseRepoRef(String(data.href ?? ""))
    if (!ref) { failed++; await stampFailure(row.id, data); continue }

    const outcome = await runEnrichment(enrichInputForRepo(ref, data))
    if (!outcome.ok) { failed++; await stampFailure(row.id, data); continue }

    const cargo = outcome.enrichment.cargo as { dependencies?: string[] } | undefined
    const next: Data = {
      ...data,
      enrichment: outcome.enrichment,
      dependencies: cargo?.dependencies ?? [],
      depsCheckedAt: outcome.enrichment.enrichedAt.slice(0, 10),
    }
    delete next.enrichAttemptedAt // clear any prior failure marker on success
    await prisma.contentItem.update({ where: { id: row.id }, data: { data: next as never } })
    succeeded++
  }

  return { processed: pending.length, succeeded, failed, progress: await enrichmentProgress() }
}
