import type { Collector } from "./types"
import { collectGrants } from "./scan/grants"
import { collectReddit } from "./scan/reddit"
import { collectGitHubOSS } from "./scan/github-oss"
import { collectRustBytes } from "./scan/rust-bytes"
import { collectPulse } from "./scan/pulse"
import { collectCompanies } from "./scan/companies"
import { collectEvents } from "./scan/events"
import { collectPortals } from "./scan/portals"
import { collectHN } from "./scan/hn"
import { collectCareers } from "./scan/careers"
import { collectTWIR } from "./scan/twir"

/**
 * Registry of every pure scanner core the pipeline runs. All scanners share this
 * one implementation; the legacy queue wrappers call the same cores and are
 * removed in Stage 4.
 */
export function getCollectors(): Collector[] {
  return [
    collectGrants,
    collectReddit,
    collectGitHubOSS,
    collectRustBytes,
    collectPulse,
    collectCompanies,
    collectEvents,
    collectPortals,
    collectHN,
    collectCareers,
    collectTWIR,
  ]
}
