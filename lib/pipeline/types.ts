import type { PendingItem, ScanLog } from "@/lib/admin/types"

/**
 * In-memory candidate flowing through the pipeline. Reuses PendingItem as the
 * shared shape between the scanner cores and the pipeline. Candidates live in
 * memory until the publish phase writes accepted items to content_items.
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
 * A pure scanner core: no auth, no persistence, just scanning. The pipeline
 * calls these and consumes the returned candidates directly.
 */
export type Collector = (ctx: ScanContext) => Promise<ScanResult>
