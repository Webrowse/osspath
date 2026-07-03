import type { PipelineReport } from "@/lib/admin/pipeline-runs"
import { relationshipsProcessor } from "./relationships"
import { ecosystemProcessor } from "./ecosystem"
import { graphProcessor } from "../graph/processor"

/**
 * Tier 2 - Corpus Intelligence.
 *
 * Cross-repository computation over the already-enriched corpus: relationships
 * and graph structure that cannot be derived from a single repo (similar repos,
 * ecosystem clustering, knowledge-graph edges). Unlike a Tier 1 Enricher, a
 * processor sees the whole corpus, so those capabilities live here, not in the
 * per-repo enricher chain.
 *
 * Processors register here and run in order. Refresh invokes this tier after
 * Tier 1 (enrichment) and before Tier 3 (exports). graphProcessor runs last so
 * it always reads this same run's freshest ecosystemProcessor output.
 */
export interface CorpusProcessor {
  readonly name: string
  run(): Promise<{ notes?: string[] }>
}

export const CORPUS_PROCESSORS: CorpusProcessor[] = [relationshipsProcessor, ecosystemProcessor, graphProcessor]

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
