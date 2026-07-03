"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/require-admin"
import { acquireRun, finishRun, heartbeat, getLatestRun, type RunRow, type PipelineReport } from "@/lib/admin/pipeline-runs"
import { runBackfillBatch, enrichmentProgress, type BackfillProgress, type BackfillResult } from "./backfill"
import { runCorpusIntelligence } from "./corpus"
import { runExports } from "./exports"
import type { RefreshResult } from "./actions"

/**
 * Maintenance actions - Tier 1 enrichment backfill. Separate from Refresh:
 * Refresh discovers and enriches new repos; backfill re-enriches the existing
 * corpus in bounded, resumable batches. Held under the admin Maintenance section.
 */

// Kept small because runEnrichmentBackfill blocks the HTTP request for the
// full batch duration; a large batch risks an unverified proxy/platform
// timeout. 25 repos * ~4 GitHub calls/repo * 860ms rate limit ~= 90s/batch.
const BACKFILL_BATCH_SIZE = 25

function backfillReport(result: BackfillResult | null, error?: unknown): PipelineReport {
  return {
    added: {}, removed: {}, scanned: 0, blocked: 0, verified: 0, reviewed: 0,
    published: 0, skipped: 0, perSource: {},
    errors: error ? [String(error)] : [],
    notes: result
      ? [`Enrichment backfill: ${result.succeeded} enriched, ${result.failed} failed, ${result.progress.remaining} remaining (v${result.progress.version})`]
      : [],
  }
}

/** Corpus-wide enrichment progress at the current version. */
export async function getEnrichmentProgress(): Promise<BackfillProgress> {
  await requireAdmin()
  return enrichmentProgress()
}

export type BackfillActionResult =
  | { started: true; result: BackfillResult }
  | { started: false; active: RunRow }

/**
 * Run one enrichment backfill batch. Takes the run lock so it cannot race a
 * Refresh, and returns the active run if one is in progress. Re-invoke until
 * `result.progress.remaining` reaches 0.
 */
export async function runEnrichmentBackfill(): Promise<BackfillActionResult> {
  await requireAdmin()

  const acq = await acquireRun()
  if (!acq.acquired) return { started: false, active: acq.active }

  const runId = acq.run.id
  try {
    const result = await runBackfillBatch(BACKFILL_BATCH_SIZE, () => heartbeat(runId))
    await finishRun(runId, { status: "done", dirty: false, report: backfillReport(result) })
    return { started: true, result }
  } catch (e) {
    await finishRun(runId, { status: "failed", dirty: false, report: backfillReport(null, e) })
    throw e
  }
}

function emptyReport(): PipelineReport {
  return {
    added: {}, removed: {}, scanned: 0, blocked: 0, verified: 0,
    reviewed: 0, published: 0, skipped: 0, errors: [], notes: [], perSource: {},
  }
}

/**
 * Run Tier 2 (Corpus Intelligence + Knowledge Graph) and Tier 3 (Exports:
 * Git snapshot + search index) directly, with no Tier 1 scan. Closes the one
 * operational gap Backfill's "Tier 1 only, never auto-publish" design left:
 * after a backfill run, nothing else deterministically republishes the
 * corpus, since Refresh's Tier 2/3 only fire when its own scan goes dirty.
 * This composes only the existing runCorpusIntelligence/runExports functions
 * already used by Refresh - no new pipeline logic. Takes the run lock like
 * every other pipeline entry point.
 */
export async function runCorpusIntelligenceAndPublish(): Promise<RefreshResult> {
  await requireAdmin()

  const acq = await acquireRun()
  if (!acq.acquired) return { started: false, active: acq.active }

  const runId = acq.run.id
  try {
    const report = emptyReport()
    await runCorpusIntelligence(report) // Tier 2 (relationships, ecosystem, graph)
    await heartbeat(runId)
    await runExports(report)            // Tier 3 (git snapshot, search index)
    await finishRun(runId, { status: "done", dirty: false, report })
  } catch (e) {
    await finishRun(runId, { status: "failed", dirty: false, report: { ...emptyReport(), errors: [String(e)] } })
    throw e
  }

  revalidatePath("/admin")
  const latest = await getLatestRun()
  return { started: true, run: latest! }
}
