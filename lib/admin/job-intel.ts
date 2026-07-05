import { readContent } from "./storage"
import {
  getJobCurationMap, getCompanyCurationMap,
  type JobCuration, type CareerPath,
} from "./curation"

/**
 * Job intelligence read layer: published jobs + companies joined with their
 * curation overrides, plus the machine's detected career path / skills so the
 * admin can see exactly what a human correction would replace.
 */

export type AdminJobRow = {
  href: string // curation key
  company: string
  companySlug: string
  role: string
  note: string
  tags: string[]
  topics: string[]
  ecosystems: string[]
  checkedAt: string | null
  expiresAt: string | null
  detectedPath: CareerPath | null
  detectedSkills: string[]
  /** hrefs of other live jobs that look like the same posting */
  possibleDuplicates: string[]
  curation: JobCuration | null
}

export type AdminCompanyRow = {
  slug: string
  name: string
  sector: string
  href: string
  githubOrg: string | null
  jobCount: number
  featured: boolean
}

type RawJob = {
  href?: string
  company?: string
  company_slug?: string
  role?: string
  note?: string
  description?: string
  tags?: string[]
  topics?: string[]
  ecosystems?: string[]
  checkedAt?: string
  expiresAt?: string
}

type RawCompany = {
  name?: string
  slug?: string
  sector?: string
  href?: string
  github_org?: string
}

// ── Detection (mirrors how the public career paths read job topics) ───────────

const PATH_SIGNALS: Array<[CareerPath, RegExp]> = [
  ["embedded", /embedded|firmware|bare.?metal|rtos|micro.?controller|robotics|hardware/i],
  ["infrastructure", /infra|kubernetes|cloud|devops|platform|deploy|observability|networking|proxy|edge/i],
  ["systems", /systems|kernel|linux|compiler|runtime|low.?level|os\b|bpf|database.?internals|storage.?engine/i],
  ["backend", /backend|api|server|web.?service|microservice|database|distributed/i],
]

function detectPath(job: RawJob): CareerPath | null {
  const haystack = [job.role, job.note, job.description, ...(job.topics ?? []), ...(job.tags ?? [])]
    .filter(Boolean).join(" ")
  for (const [path, rx] of PATH_SIGNALS) {
    if (rx.test(haystack)) return path
  }
  return null
}

const SKILL_SIGNALS: Array<[string, RegExp]> = [
  ["Tokio", /tokio|async/i],
  ["Networking", /network|quic|http\/?3|tcp|grpc|proxy/i],
  ["Linux", /linux|bpf|kernel|syscall/i],
  ["Databases", /database|postgres|storage engine|sql|dataframe/i],
  ["WASM", /wasm|webassembly/i],
  ["Embedded", /embedded|firmware|rtos|no_std/i],
  ["Distributed systems", /distributed|consensus|raft|replication/i],
  ["Cryptography", /crypto|zero.?knowledge|zk|tls/i],
  ["Compilers", /compiler|llvm|parser|type.?checker/i],
]

function detectSkills(job: RawJob): string[] {
  const haystack = [job.role, job.note, job.description, ...(job.topics ?? []), ...(job.ecosystems ?? []), ...(job.tags ?? [])]
    .filter(Boolean).join(" ")
  return SKILL_SIGNALS.filter(([, rx]) => rx.test(haystack)).map(([name]) => name)
}

// ── Duplicate detection ───────────────────────────────────────────────────────
// Same company + near-identical normalised role, or identical href published
// twice. Surfaced as suggestions; a human confirms with markJobDuplicate.

function normalizeRole(role: string): string {
  return role.toLowerCase().replace(/\b(senior|staff|principal|junior|lead|sr|jr)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim()
}

function findDuplicates(jobs: RawJob[]): Map<string, string[]> {
  const byKey = new Map<string, string[]>()
  for (const j of jobs) {
    if (!j.href) continue
    const key = `${(j.company_slug ?? j.company ?? "").toLowerCase()}::${normalizeRole(j.role ?? "")}`
    byKey.set(key, [...(byKey.get(key) ?? []), j.href])
  }
  const out = new Map<string, string[]>()
  for (const hrefs of byKey.values()) {
    if (hrefs.length < 2) continue
    for (const href of hrefs) out.set(href, hrefs.filter((h) => h !== href))
  }
  return out
}

// ── Rows ──────────────────────────────────────────────────────────────────────

export async function getAdminJobs(): Promise<AdminJobRow[]> {
  const [jobs, curationMap] = await Promise.all([
    readContent("jobs") as Promise<RawJob[]>,
    getJobCurationMap(),
  ])
  const dupes = findDuplicates(jobs)

  return jobs
    .filter((j) => j.href)
    .map((j) => ({
      href: j.href!,
      company: j.company ?? "",
      companySlug: j.company_slug ?? "",
      role: j.role ?? "",
      note: j.note ?? j.description ?? "",
      tags: j.tags ?? [],
      topics: j.topics ?? [],
      ecosystems: j.ecosystems ?? [],
      checkedAt: j.checkedAt ?? null,
      expiresAt: j.expiresAt ?? null,
      detectedPath: detectPath(j),
      detectedSkills: detectSkills(j),
      possibleDuplicates: dupes.get(j.href!) ?? [],
      curation: curationMap[j.href!] ?? null,
    }))
}

export async function getAdminCompanies(): Promise<AdminCompanyRow[]> {
  const [companies, jobs, curationMap] = await Promise.all([
    readContent("companies") as Promise<RawCompany[]>,
    readContent("jobs") as Promise<RawJob[]>,
    getCompanyCurationMap(),
  ])

  const jobCounts = new Map<string, number>()
  for (const j of jobs) {
    const slug = (j.company_slug ?? "").toLowerCase()
    if (slug) jobCounts.set(slug, (jobCounts.get(slug) ?? 0) + 1)
  }

  return companies
    .filter((c) => c.name)
    .map((c) => {
      const slug = (c.slug ?? c.name!.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "")
      return {
        slug,
        name: c.name!,
        sector: c.sector ?? "",
        href: c.href ?? "",
        githubOrg: c.github_org ?? null,
        jobCount: jobCounts.get(slug) ?? 0,
        featured: !!curationMap[slug]?.featured,
      }
    })
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name))
}
