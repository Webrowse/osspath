import "server-only"
import { JOBS } from "@/content/jobs"
import type { EditorialJob } from "@/content/jobs"
import type { EcoTag } from "@/lib/eco-tags"

export type { EditorialJob }
export { JOBS }

export function getJobBySlug(slug: string): EditorialJob | undefined {
  return JOBS.find(j => j.slug === slug)
}

export function getJobsByCompany(companySlug: string): EditorialJob[] {
  return JOBS.filter(j => j.company_slug === companySlug)
}

export function getActiveJobsByCompany(companySlug: string): EditorialJob[] {
  const now = new Date()
  return JOBS.filter(j =>
    j.company_slug === companySlug &&
    (!j.expiresAt || new Date(j.expiresAt) > now)
  )
}

export function getJobsForEcosystem(eco: EcoTag): EditorialJob[] {
  return JOBS.filter(j => j.ecosystems?.includes(eco))
}
