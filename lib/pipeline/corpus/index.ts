import type { PipelineReport } from "@/lib/admin/pipeline-runs"
import { relationshipsProcessor } from "./relationships"

/**
 * Tier 2 - Corpus Intelligence.
 *
 * Cross-repository computation over the already-enriched corpus: relationships
 * and graph structure that cannot be derived from a single repo (similar repos,
 * ecosystem clustering, knowledge-graph edges). Unlike a Tier 1 Enricher, a
 * processor sees the whole corpus, so those capabilities live here, not in the
 * per-repo enricher chain.
 *
 * The registry is intentionally empty today; relational milestones register
 * processors here and the tier runs them in order. Refresh invokes this tier
 * after Tier 1 (enrichment) and before Tier 3 (exports).
 */
export interface CorpusProcessor {
  readonly name: string
  run(): Promise<{ notes?: string[] }>
}

export const CORPUS_PROCESSORS: CorpusProcessor[] = [relationshipsProcessor]

export async function runCorpusIntelligence(report: PipelineReport): Promise<void> {
  for (const processor of CORPUS_PROCESSORS) {
    try {
      const { notes } = await processor.run()
      if (notes) report.notes.push(...notes.map((n) => `corpus/${processor.name}: ${n}`))
    } catch (err) {
      report.errors.push(`corpus/${processor.name}: ${(err as Error)?.message ?? err}`)
    }
  }
}
