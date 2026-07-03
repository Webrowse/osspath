/**
 * CLI: run exactly one Tier 1 backfill batch and exit. Acquire the run lock,
 * process one batch, release the lock, exit - no loop, no long-lived process.
 *
 * Mirrors runEnrichmentBackfill() (lib/pipeline/maintenance-actions.ts) minus
 * its requireAdmin() check, which is a browser-session concept that doesn't
 * apply to a headless invocation. Reuses acquireRun/runBackfillBatch/finishRun/
 * heartbeat completely unchanged - no enrichment logic lives in this file.
 *
 * If another run is already active, exits 0 (not an error): batches have taken
 * up to ~970s in production, so an overlapping scheduled tick is expected
 * behavior, not a failure.
 *
 * Run: tsx scripts/run-one-backfill-batch.ts
 */
import { config } from "dotenv"

// Load env before the Prisma client is constructed (dynamic import in main()).
config({ path: ".env.local" })
config()

const BATCH_SIZE = 25

function emptyReport() {
  return {
    added: {}, removed: {}, scanned: 0, blocked: 0, verified: 0, reviewed: 0,
    published: 0, skipped: 0, errors: [] as string[], notes: [] as string[], perSource: {},
  }
}

async function main() {
  const { acquireRun, finishRun, heartbeat } = await import("@/lib/admin/pipeline-runs")
  const { runBackfillBatch } = await import("@/lib/pipeline/backfill")

  const acq = await acquireRun()
  if (!acq.acquired) {
    console.log(`Skipped: run ${acq.active.id} already active (status=${acq.active.status})`)
    process.exit(0)
  }

  const runId = acq.run.id
  try {
    const result = await runBackfillBatch(BATCH_SIZE, () => heartbeat(runId))
    await finishRun(runId, {
      status: "done",
      dirty: false,
      report: {
        ...emptyReport(),
        notes: [`Backfill batch: ${result.succeeded} succeeded, ${result.failed} failed, ${result.progress.remaining} remaining (v${result.progress.version})`],
      },
    })
    console.log(`✓ Batch done: succeeded=${result.succeeded} failed=${result.failed} remaining=${result.progress.remaining}`)
    process.exit(0)
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err)
    await finishRun(runId, { status: "failed", dirty: false, report: { ...emptyReport(), errors: [msg] } })
    console.error(`✗ Batch failed: ${msg}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(`✗ run-one-backfill-batch: uncaught error: ${(err as Error)?.message ?? err}`)
  process.exit(1)
})
