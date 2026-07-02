"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/require-admin"
import {
  acquireRun, finishRun, getActiveRun, getLatestRun, forceUnlock,
  type RunRow, type PipelineReport,
} from "@/lib/admin/pipeline-runs"
import { runPipeline } from "./run"
import { dueScanJobs } from "./dispatch"
import { publishCurrentSnapshot, publishNote } from "./publish"
import { runCorpusIntelligence } from "./corpus"
import { runExports } from "./exports"

export type RefreshResult =
  | { started: true; run: RunRow }
  | { started: false; active: RunRow }

function emptyReport(): PipelineReport {
  return {
    added: {}, removed: {}, scanned: 0, blocked: 0, verified: 0,
    reviewed: 0, published: 0, skipped: 0, errors: [], notes: [], perSource: {},
  }
}

function failedReport(err: unknown): PipelineReport {
  return { ...emptyReport(), errors: [String(err)] }
}

/**
 * Refresh orchestrates the three tiers in order:
 *   Tier 1  Repository Enrichment - discover, enrich, persist to PostgreSQL.
 *   Tier 2  Corpus Intelligence   - cross-repo relationships over the corpus.
 *   Tier 3  Exports               - Git snapshot and other derived artifacts.
 * Tiers 2 and 3 run only when Tier 1 changed the corpus (dirty). A Tier 3
 * failure never fails the run - PostgreSQL is already correct and the failure
 * is surfaced for a manual Republish. Returns the active run if one is running.
 */
export async function runRefresh(): Promise<RefreshResult> {
  await requireAdmin()

  const acq = await acquireRun()
  if (!acq.acquired) return { started: false, active: acq.active }

  const runId = acq.run.id
  try {
    const { report, dirty } = await runPipeline(runId, await dueScanJobs()) // Tier 1
    if (dirty) {
      await runCorpusIntelligence(report) // Tier 2
      await runExports(report)            // Tier 3
    }
    await finishRun(runId, { status: "done", dirty, report })
  } catch (e) {
    await finishRun(runId, { status: "failed", dirty: false, report: failedReport(e) })
    throw e
  }

  revalidatePath("/admin")
  const latest = await getLatestRun()
  return { started: true, run: latest! }
}

/**
 * Re-export the current Postgres snapshot and publish it to Git, without
 * scanning or writing Postgres. Recovery path for a failed or uncertain push.
 * Takes the same run lock as Refresh so it can never read a half-written
 * snapshot mid-run, and always regenerates from live Postgres (no replay).
 */
export async function republishSnapshot(): Promise<RefreshResult> {
  await requireAdmin()

  const acq = await acquireRun()
  if (!acq.acquired) return { started: false, active: acq.active }

  const runId = acq.run.id
  try {
    const report = emptyReport()
    report.publish = await publishCurrentSnapshot()
    report.notes.push(publishNote(report.publish))
    await finishRun(runId, { status: "done", dirty: false, report })
  } catch (e) {
    await finishRun(runId, { status: "failed", dirty: false, report: failedReport(e) })
    throw e
  }

  revalidatePath("/admin")
  const latest = await getLatestRun()
  return { started: true, run: latest! }
}

export async function getPipelineStatus(): Promise<{ active: RunRow | null; latest: RunRow | null }> {
  await requireAdmin()
  const [active, latest] = await Promise.all([getActiveRun(), getLatestRun()])
  return { active, latest }
}

/** Manual recovery for a wedged lock. */
export async function unlockPipeline(): Promise<number> {
  await requireAdmin()
  const n = await forceUnlock()
  revalidatePath("/admin")
  return n
}
