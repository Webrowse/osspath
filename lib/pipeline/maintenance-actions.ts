"use server"

import { requireAdmin } from "@/lib/admin/require-admin"
import { acquireRun, finishRun, heartbeat, type RunRow, type PipelineReport } from "@/lib/admin/pipeline-runs"
import { runBackfillBatch, enrichmentProgress, type BackfillProgress, type BackfillResult } from "./backfill"

/**
 * Maintenance actions - Tier 1 enrichment backfill. Separate from Refresh:
 * Refresh discovers and enriches new repos; backfill re-enriches the existing
 * corpus in bounded, resumable batches. Held under the admin Maintenance section.
 */

const BACKFILL_BATCH_SIZE = 100

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
