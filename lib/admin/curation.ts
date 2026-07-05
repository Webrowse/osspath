import type { OSSPath } from "@/content/oss-paths"
import { readContent } from "./storage"
import { listOverrides } from "./overrides"
import type { AdminRepoRow, RepoCuration, JobCuration, CompanyCuration } from "./curation-types"

/**
 * Curation data layer: the human judgment overlay on top of automated
 * intelligence. Raw pipeline output (content_items) is never mutated - every
 * human decision lives in its own Override row (kind "repo-curation" /
 * "job-curation" / "company-curation") keyed by the item's natural key, and is
 * merged at read time. Deleting an override restores pure machine output.
 *
 * Server-only (reads Prisma). Types, constants, and pure computations live in
 * ./curation-types so client components can share them.
 */

export * from "./curation-types"

// ── Curation maps (natural key -> override) ──────────────────────────────────

export async function getRepoCurationMap(): Promise<Record<string, RepoCuration>> {
  const rows = await listOverrides("repo-curation")
  return Object.fromEntries(rows.map((r) => [r.key, r.data as RepoCuration]))
}

export async function getJobCurationMap(): Promise<Record<string, JobCuration>> {
  const rows = await listOverrides("job-curation")
  return Object.fromEntries(rows.map((r) => [r.key, r.data as JobCuration]))
}

export async function getCompanyCurationMap(): Promise<Record<string, CompanyCuration>> {
  const rows = await listOverrides("company-curation")
  return Object.fromEntries(rows.map((r) => [r.key, r.data as CompanyCuration]))
}

// ── Quality signals ───────────────────────────────────────────────────────────

function computeMissing(r: OSSPath): string[] {
  const missing: string[] = []
  if (!r.note?.trim()) missing.push("description")
  if (!r.license) missing.push("license")
  if (!r.topics || r.topics.length === 0) missing.push("topics")
  if (!r.enrichment) missing.push("enrichment")
  if (!r.ecosystemIntelligence) missing.push("classification")
  if (!r.pushedAt) missing.push("activity")
  return missing
}

function computeSuspicious(r: OSSPath, confidence: number | null): boolean {
  const stars = r.stars ?? 0
  if (stars < 2000) return false
  const tier = r.activityTier ?? "dormant"
  if (tier === "dormant") return true
  if (!r.license) return true
  if (confidence !== null && confidence < 0.3) return true
  if (!r.enrichment) return true
  return false
}

// ── Admin repo rows: raw corpus + curation + computed quality signals ─────────

/**
 * The full corpus joined with curation, as the repo control screen consumes
 * it. Reads Postgres (source of truth). Rows are deliberately trimmed - the
 * client gets what the table renders, not the whole enrichment payload.
 */
export async function getAdminRepos(): Promise<AdminRepoRow[]> {
  const [items, curationMap, companyOrgs] = await Promise.all([
    readContent("oss") as Promise<unknown[]>,
    getRepoCurationMap(),
    getCompanyOrgs(),
  ])

  return (items as OSSPath[]).map((r) => {
    const slug = `${r.owner}/${r.name}`
    const confidence = r.ecosystemIntelligence?.confidence ?? null
    return {
      slug,
      name: r.name,
      owner: r.owner,
      eco: r.eco,
      href: r.href,
      note: r.note ?? "",
      stars: r.stars ?? 0,
      forks: r.forks ?? 0,
      openIssues: r.openIssuesCount ?? 0,
      language: r.language ?? null,
      license: r.license ?? null,
      kind: r.kind ?? "code",
      activityTier: r.activityTier ?? "dormant",
      pushedAt: r.pushedAt ?? null,
      ecosystems: r.ecosystemIntelligence?.ecosystems ?? r.ecosystem ?? [],
      depCount: r.dependencies?.length ?? r.enrichment?.cargo?.dependencies?.length ?? 0,
      confidence,
      domain: r.ecosystemIntelligence?.domain ?? null,
      companyBacked: companyOrgs.has(r.owner.toLowerCase()),
      missing: computeMissing(r),
      suspicious: computeSuspicious(r, confidence),
      curation: curationMap[slug] ?? null,
    }
  })
}

/** GitHub orgs of tracked companies - marks repos as company-backed. */
async function getCompanyOrgs(): Promise<Set<string>> {
  const companies = await readContent("companies")
  const orgs = new Set<string>()
  for (const c of companies) {
    const org = (c as { github_org?: string }).github_org
    if (org) orgs.add(org.toLowerCase())
  }
  return orgs
}
