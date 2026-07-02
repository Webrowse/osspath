import { exportSnapshot } from "./snapshot"
import { publishSnapshot } from "./github-publisher"
import { recordPublish } from "@/lib/admin/publish-metadata"
import type { PublishReport } from "@/lib/admin/pipeline-runs"

/**
 * Export the current PostgreSQL snapshot and publish it to Git, recording
 * PublishMetadata on success. Always regenerates from live Postgres - there is
 * no stored snapshot to replay, so a retry (or Republish) can only ever move
 * Git toward the latest DB state, never toward a stale one.
 *
 * Never throws: a DB read or push failure is returned as { state: "failed" } so
 * the caller keeps the (correct) Postgres state and can surface it for retry.
 */
export async function publishCurrentSnapshot(): Promise<PublishReport> {
  try {
    const files = await exportSnapshot()
    const result = await publishSnapshot(files)
    if (result.state === "committed") {
      await recordPublish({ commitSha: result.commitSha, contentSha256: result.contentSha256 })
      return { state: "committed", commitSha: result.commitSha }
    }
    if (result.state === "skipped_no_changes") return { state: "skipped_no_changes" }
    return { state: "failed", error: result.error }
  } catch (err) {
    return { state: "failed", error: (err as Error)?.message ?? String(err) }
  }
}

/** One-line report note for a publish outcome (never claims deployment success). */
export function publishNote(report: PublishReport): string {
  switch (report.state) {
    case "committed":
      return `Git commit created (${report.commitSha?.slice(0, 7)})`
    case "skipped_no_changes":
      return "No content changes - nothing to publish"
    case "failed":
      return `Publish failed: ${report.error}`
  }
}
