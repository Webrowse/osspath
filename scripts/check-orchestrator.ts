/**
 * Guard for the reusable pipeline orchestrator (lib/pipeline/orchestrator).
 * Uses injected Tier 2/3 stubs throughout, so this never invokes the real
 * Corpus Intelligence or Exports tiers - Tier 3 can push to GitHub, and this
 * script must never perform a network or production side effect.
 * Run: tsx scripts/check-orchestrator.ts
 */
import { runPipelineOrchestrator } from "@/lib/pipeline/orchestrator"
import type { PipelineReport } from "@/lib/admin/pipeline-runs"

function emptyReport(): PipelineReport {
  return {
    added: {}, removed: {}, scanned: 0, blocked: 0, verified: 0,
    reviewed: 0, published: 0, skipped: 0, errors: [], notes: [], perSource: {},
  }
}

let failed = 0
function assert(label: string, cond: boolean) { if (!cond) { console.error(`x ${label}`); failed++ } }

async function main() {
  // dirty=false: Tier 2/3 must be skipped entirely.
  {
    let tier2Ran = false
    let tier3Ran = false
    const { dirty } = await runPipelineOrchestrator(
      emptyReport(),
      async () => ({ dirty: false }),
      { tier2: async () => { tier2Ran = true }, tier3: async () => { tier3Ran = true } },
    )
    assert("dirty=false -> returns dirty:false", dirty === false)
    assert("dirty=false -> tier2 skipped", tier2Ran === false)
    assert("dirty=false -> tier3 skipped", tier3Ran === false)
  }

  // dirty=true: tier1 -> tier2 -> tier3 run in order, all mutating the same report.
  {
    const report = emptyReport()
    const order: string[] = []
    const { dirty } = await runPipelineOrchestrator(
      report,
      async (r) => { order.push("tier1"); r.notes.push("t1"); return { dirty: true } },
      {
        tier2: async (r) => { order.push("tier2"); r.notes.push("t2") },
        tier3: async (r) => { order.push("tier3"); r.notes.push("t3") },
      },
    )
    assert("dirty=true -> returns dirty:true", dirty === true)
    assert("dirty=true -> runs tier1,tier2,tier3 in order", JSON.stringify(order) === JSON.stringify(["tier1", "tier2", "tier3"]))
    assert("dirty=true -> all tiers share one mutated report", JSON.stringify(report.notes) === JSON.stringify(["t1", "t2", "t3"]))
  }

  // No overrides + dirty=false: resolves the real Tier 2/3 references but never
  // calls them (dirty gates the call, not the resolution) - safe, no I/O.
  {
    const report = emptyReport()
    const { dirty } = await runPipelineOrchestrator(report, async () => ({ dirty: false }))
    assert("default tiers, dirty=false -> no error, no side effect", dirty === false && report.errors.length === 0)
  }

  if (failed) { console.error(`\n${failed} assertion(s) failed`); process.exit(1) }
  console.log("ok - orchestrator: Tier1 -> Tier2 -> Tier3 sequencing and dirty-gating is correct")
}

main().catch((e) => { console.error("THREW", e?.message ?? e); process.exit(1) })
