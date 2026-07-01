import type { PendingItem, ScanLog } from "@/lib/admin/types"

/**
 * In-memory candidate flowing through the pipeline. Reuses PendingItem so there
 * is a single shape shared by the pure scanner cores, the legacy queue wrappers,
 * and the new pipeline. Candidates are never persisted to admin_queue by the
 * pipeline; they live in memory until the publish phase writes accepted items.
 */
export type Candidate = PendingItem

/** What a pure scanner core returns: a scan log plus the candidates it found. */
export type ScanResult = { log: ScanLog; items: Candidate[] }

/**
 * Context passed to a scanner core. isKnown lets a core skip expensive
 * extraction (notably DeepSeek for unstructured sources) for URLs that are
 * already published or blocklisted, so cost scales with genuinely new content.
 */
export type ScanContext = {
  isKnown: (href: string) => boolean
}

/**
 * A pure scanner core: no auth, no persistence, just scanning. Both the legacy
 * server-action wrapper and the pipeline call these. The wrappers add
 * persistence to admin_queue for backwards compatibility during the migration;
 * the pipeline consumes the candidates directly.
 */
export type Collector = (ctx: ScanContext) => Promise<ScanResult>
