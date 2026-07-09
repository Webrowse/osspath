import "server-only"
import { getOSSRepos } from "@/lib/oss-data"
import { getEcoTags } from "@/lib/eco-tags"
import { COMPANIES } from "@/content/companies"
import { getOwnerCompanyIndex } from "@/lib/company-data"
import type { EcoTag } from "@/lib/eco-tags"
import type { OSSPublicRepo } from "@/content/oss-paths"
import type { EcosystemCompany } from "@/content/companies"

export { getJobsForEcosystem as getActiveJobsForEcosystem } from "@/lib/jobs-data"
export { getProgramsForEcosystem } from "@/lib/grants-data"

// All repos tagged with the given ecosystem, sorted by stars descending.
export function getReposByEco(tag: EcoTag): OSSPublicRepo[] {
  return getOSSRepos()
    .filter(r =>
      getEcoTags(r.dependencies, {
        owner:  r.owner  ?? undefined,
        name:   r.name   ?? undefined,
        topics: r.topics ?? undefined,
      }).includes(tag)
    )
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
}

// Companies whose GitHub org has at least one repo tagged with this ecosystem.
export function getOrgsByEco(tag: EcoTag): EcosystemCompany[] {
  const ownerIndex  = getOwnerCompanyIndex()
  const orgsWithEco = new Set<string>()

  for (const r of getOSSRepos()) {
    if (!r.owner) continue
    const tags = getEcoTags(r.dependencies, {
      owner:  r.owner,
      name:   r.name   ?? undefined,
      topics: r.topics ?? undefined,
    })
    if (tags.includes(tag)) orgsWithEco.add(r.owner.toLowerCase())
  }

  return COMPANIES.filter(c =>
    c.github_org != null && orgsWithEco.has(c.github_org.toLowerCase())
  )
}
