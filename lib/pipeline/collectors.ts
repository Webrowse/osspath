import type { Collector } from "./types"
import { collectGrants } from "./scan/grants"
import { collectReddit } from "./scan/reddit"

/**
 * Registry of pure scanner cores the pipeline runs. Cores are added here as each
 * scanner is migrated off the legacy queue workflow. The pipeline scans exactly
 * what is registered; anything not yet migrated is still covered by the old scan
 * panel until it is removed in Stage 4.
 */
export function getCollectors(): Collector[] {
  return [
    collectGrants,
    collectReddit,
    // more scanner cores are registered here as they are migrated
  ]
}
