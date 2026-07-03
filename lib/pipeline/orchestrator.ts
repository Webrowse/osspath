import type { PipelineReport } from "@/lib/admin/pipeline-runs"
import { runCorpusIntelligence } from "./corpus"
import { runExports } from "./exports"

/**
 * Reusable pipeline orchestrator: Tier 1 -> Tier 2 (Corpus Intelligence) ->
 * Tier 3 (Exports), in that order. Tiers 2-3 run only when Tier 1 reports the
 * corpus changed (dirty).
 *
 * This is the one place tier sequencing lives. Entry points (Refresh, Backfill,
 * future Maintenance jobs, future scheduled automation) supply Tier 1 behavior
 * and call this - they must never re-implement the Tier 1 -> 2 -> 3 sequence
 * themselves, so orchestration logic cannot accumulate inside any one entry
 * point. An entry point that only needs Tier 1 (e.g. a Postgres-only backfill
 * batch) simply does not call the orchestrator; that is a caller decision, not
 * something the orchestrator needs a flag for.
 */

/**
 * Tier 1 work supplied by the caller. It mutates `report` in place (matching
 * how Tier 2 and Tier 3 already report) and returns whether the corpus
 * changed, which gates whether Tiers 2-3 run.
 */
export type Tier1 = (report: PipelineReport) => Promise<{ dirty: boolean }>

type Tier2Runner = (report: PipelineReport) => Promise<void>
type Tier3Runner = (report: PipelineReport) => Promise<void>

/**
 * Tier 2/3 runners default to the real Corpus Intelligence and Exports tiers.
 * The override is exposed only so tests can verify the Tier 1 -> 2 -> 3
 * sequencing and dirty-gating without invoking real network/export side
 * effects (Tier 3 can push to GitHub) - production callers never pass this.
 */
export async function runPipelineOrchestrator(
  report: PipelineReport,
  tier1: Tier1,
  overrides: { tier2?: Tier2Runner; tier3?: Tier3Runner } = {},
): Promise<{ dirty: boolean }> {
  const tier2 = overrides.tier2 ?? runCorpusIntelligence
  const tier3 = overrides.tier3 ?? runExports

  const { dirty } = await tier1(report)
  if (dirty) {
    await tier2(report) // Tier 2
    await tier3(report) // Tier 3
  }
  return { dirty }
}
