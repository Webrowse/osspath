import type { PipelineReport } from "@/lib/admin/pipeline-runs"
import { publishCurrentSnapshot, publishNote } from "@/lib/pipeline/publish"

/**
 * Tier 3 - Exports.
 *
 * Turns the enriched corpus into derived artifacts. Today the only exporter is
 * the Git snapshot (PostgreSQL -> canonical JSON -> commit -> Railway). Future
 * exporters (AI datasets, sitemaps, RSS, public data dumps) register here and
 * run in order. Refresh invokes this tier last, after Tier 1 and Tier 2.
 */
export interface Exporter {
  readonly name: string
  run(report: PipelineReport): Promise<void>
}

const gitSnapshotExporter: Exporter = {
  name: "git-snapshot",
  async run(report) {
    report.publish = await publishCurrentSnapshot()
    report.notes.push(publishNote(report.publish))
  },
}

export const EXPORTERS: Exporter[] = [gitSnapshotExporter]

export async function runExports(report: PipelineReport): Promise<void> {
  for (const exporter of EXPORTERS) {
    try {
      await exporter.run(report)
    } catch (err) {
      report.errors.push(`export/${exporter.name}: ${(err as Error)?.message ?? err}`)
    }
  }
}
