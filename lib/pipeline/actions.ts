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

/** Run the full pipeline. Returns the active run instead if one is in progress. */
export async function runRefresh(): Promise<RefreshResult> {
  await requireAdmin()

  const acq = await acquireRun()
  if (!acq.acquired) return { started: false, active: acq.active }

  const runId = acq.run.id
  try {
    const { report, dirty } = await runPipeline(runId, await dueScanJobs())
    // Only a dirty run changed published content, so only then publish the
    // snapshot to Git. A publish failure never fails the run - Postgres is
    // already correct; the failure is surfaced for a manual Republish.
    if (dirty) {
      report.publish = await publishCurrentSnapshot()
      report.notes.push(publishNote(report.publish))
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
