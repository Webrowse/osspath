"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/require-admin"
import {
  acquireRun, finishRun, getActiveRun, getLatestRun, forceUnlock,
  type RunRow, type PipelineReport,
} from "@/lib/admin/pipeline-runs"
import { runPipeline } from "./run"
import { getCollectors } from "./collectors"

export type RefreshResult =
  | { started: true; run: RunRow }
  | { started: false; active: RunRow }

function failedReport(err: unknown): PipelineReport {
  return {
    added: {}, removed: {}, scanned: 0, blocked: 0, verified: 0,
    reviewed: 0, published: 0, skipped: 0, errors: [String(err)], notes: [], perSource: {},
  }
}

/** Run the full pipeline. Returns the active run instead if one is in progress. */
export async function runRefresh(): Promise<RefreshResult> {
  await requireAdmin()

  const acq = await acquireRun()
  if (!acq.acquired) return { started: false, active: acq.active }

  const runId = acq.run.id
  try {
    const { report, dirty } = await runPipeline(runId, getCollectors())
    await finishRun(runId, { status: "done", dirty, report })
    // A dirty run means published content changed; the rebuild trigger lands next.
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
