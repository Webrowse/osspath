/**
 * Slug helpers shared by the publish pipeline and the one-off backfill, so the
 * "every published job has a routing slug" invariant is derived identically in
 * both places.
 */

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

/**
 * Routing slug for a job whose scraped record lacks one. Derived from company +
 * role so /jobs/[slug] (dynamicParams = false) can render it; falls back to the
 * href, then a constant, so the result is always a non-empty string.
 */
export function deriveJobSlug(job: Record<string, unknown>): string {
  const fromName = slugify(`${String(job.company ?? "")} ${String(job.role ?? "")}`)
  if (fromName) return fromName
  return slugify(String(job.href ?? "")) || "job"
}
