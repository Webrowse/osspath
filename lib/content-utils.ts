/**
 * Utilities for curated content: expiry filtering, freshness display,
 * and stale-content detection for the review workflow.
 *
 * All comparisons use the build-time date (Date.now() at render),
 * which is correct for statically-generated pages.
 */

// How often each content type should be re-verified.
// Content past its interval appears in validate-content output.
export const REVIEW_INTERVALS = {
  jobs:      7,   // days
  grants:    14,
  oss:       30,
  events:    14,
  pulse:     60,
  companies: 60,
} as const

export type ContentType = keyof typeof REVIEW_INTERVALS

// ── Expiry ────────────────────────────────────────────────────────────────────

export function isActive(expiresAt?: string): boolean {
  if (!expiresAt) return true
  return new Date(expiresAt) > new Date()
}

export function filterActive<T extends { expiresAt?: string }>(items: T[]): T[] {
  return items.filter((item) => isActive(item.expiresAt))
}

// ── Staleness ─────────────────────────────────────────────────────────────────

/** Days since last check. Returns null if checkedAt is absent. */
export function daysSinceCheck(checkedAt?: string): number | null {
  if (!checkedAt) return null
  return Math.floor((Date.now() - new Date(checkedAt).getTime()) / 86400000)
}

/** True when the item is overdue for review but not yet expired. */
export function isStale(type: ContentType, checkedAt?: string): boolean {
  const days = daysSinceCheck(checkedAt)
  if (days === null) return true
  return days > REVIEW_INTERVALS[type]
}

// ── Freshness display ─────────────────────────────────────────────────────────

export function formatCheckedAt(checkedAt?: string): string | null {
  if (!checkedAt) return null
  const days = daysSinceCheck(checkedAt)
  if (days === null || days < 0) return null
  if (days === 0) return "Checked today"
  if (days <= 6)  return `Checked ${days}d ago`
  if (days <= 27) return `Checked ${Math.floor(days / 7)}w ago`
  return `Verified ${new Date(checkedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
}

// ── Search ────────────────────────────────────────────────────────────────────

/** Simple case-insensitive substring match across an object's string values. */
export function matchesQuery(item: Record<string, unknown>, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase()
  return Object.values(item).some((v) =>
    typeof v === "string" && v.toLowerCase().includes(q)
  )
}
