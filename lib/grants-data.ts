import "server-only"
import { FUNDERS } from "@/content/funders"
import { GRANTS as PROGRAMS } from "@/content/grants"
import type { Funder } from "@/content/funders"
import type { FundingProgram } from "@/content/grants"
import type { EcoTag } from "@/lib/eco-tags"

export type { Funder, FundingProgram }
export { FUNDERS, PROGRAMS }

// ── Funder lookups ────────────────────────────────────────────────────────────

let _funderIndex: Map<string, Funder> | null = null

function getFunderIndex(): Map<string, Funder> {
  if (_funderIndex) return _funderIndex
  _funderIndex = new Map(FUNDERS.map(f => [f.slug, f]))
  return _funderIndex
}

export function getFunderBySlug(slug: string): Funder | undefined {
  return getFunderIndex().get(slug)
}

// ── Program lookups ───────────────────────────────────────────────────────────

export function getProgramBySlug(slug: string): FundingProgram | undefined {
  return PROGRAMS.find(p => p.slug === slug)
}

export function getProgramsByFunder(funderSlug: string): FundingProgram[] {
  return PROGRAMS.filter(p => p.funder_slug === funderSlug)
}

// Programs relevant to an ecosystem.
// Programs with no ecosystems set are broad (cover all ecosystems) and are always included.
export function getProgramsForEcosystem(eco: EcoTag): FundingProgram[] {
  return PROGRAMS.filter(p =>
    !p.ecosystems || p.ecosystems.length === 0 || p.ecosystems.includes(eco)
  )
}

// Programs funded BY a known company (company is the funder).
export function getProgramsForCompany(companySlug: string): FundingProgram[] {
  return PROGRAMS.filter(p => {
    const funder = getFunderBySlug(p.funder_slug)
    return funder?.company_slug === companySlug
  })
}

// Funders whose company_slug matches — the company IS the funder.
export function getFunderForCompany(companySlug: string): Funder | undefined {
  return FUNDERS.find(f => f.company_slug === companySlug)
}

// Programs that list the given "owner/repo" path in their funded_repos.
export function getProgramsForRepo(slug: string): { program: FundingProgram; funder: Funder | undefined }[] {
  const slugLower = slug.toLowerCase()
  const result: { program: FundingProgram; funder: Funder | undefined }[] = []
  for (const p of PROGRAMS) {
    if ((p.funded_repos ?? []).some(r => r.toLowerCase() === slugLower)) {
      result.push({ program: p, funder: getFunderBySlug(p.funder_slug) })
    }
  }
  return result
}

// ── Incoming funding (reverse traversal) ──────────────────────────────────────
// Programs that have funded repos owned by the given GitHub org.
// This surfaces the Program → funded_repo → Org edge on org profile pages.

export type IncomingFund = {
  program: FundingProgram
  funder:  Funder | undefined
  repos:   string[]          // funded_repo paths belonging to this org
}

export function getIncomingFundingForOrg(githubOrg: string | null | undefined): IncomingFund[] {
  if (!githubOrg) return []
  const orgLower = githubOrg.toLowerCase()
  const result: IncomingFund[] = []
  for (const p of PROGRAMS) {
    const ownedRepos = (p.funded_repos ?? []).filter(
      r => r.split("/")[0].toLowerCase() === orgLower
    )
    if (ownedRepos.length === 0) continue
    result.push({ program: p, funder: getFunderBySlug(p.funder_slug), repos: ownedRepos })
  }
  return result
}
