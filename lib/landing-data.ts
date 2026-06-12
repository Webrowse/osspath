import "server-only"

import { COMPANIES }                       from "@/content/companies"
import { PROGRAMS }                        from "@/content/programs"
import { FUNDERS }                         from "@/content/funders"
import { JOBS }                            from "@/content/jobs"
import { LIFECYCLE_EDGES }                 from "@/content/lifecycle-edges"
import { getOSSRepos }                     from "@/lib/oss-data"
import { getDepPageCounts }                from "@/lib/deps-data"
import { getEcoTags, ECO_LABEL }           from "@/lib/eco-tags"
import { getOwnerCompanyIndex }            from "@/lib/company-data"
import { getFunderBySlug }                 from "@/lib/grants-data"
import type { EcoTag }                     from "@/lib/eco-tags"
import type { OSSPath }                    from "@/content/oss-paths"
import type { EcosystemCompany, OrgType }  from "@/content/companies"
import type { FundingProgram }             from "@/content/programs"
import type { Funder }                     from "@/content/funders"
import type { EditorialJob }               from "@/content/jobs"

// ─── Exported Types ───────────────────────────────────────────────────────────

export type GraphStats = {
  totalRepos:      number
  activeRepos:     number
  totalOrgs:       number
  activeJobs:      number
  totalPrograms:   number
  rollingPrograms: number
  totalFunders:    number
  fundingLinks:    number   // sum of funded_repos across all programs
  lifecycleEdges:  number
}

export type JourneyNodeType = "fund" | "repo" | "org" | "eco" | "job" | "crate"

export type JourneyNode = {
  type:     JourneyNodeType
  label:    string   // primary display text
  sublabel: string   // supporting detail (stars, repo count, status)
  href:     string   // internal route
}

export type LandingJourney = {
  id:       string
  name:     string
  story:    string           // one-sentence narrative
  steps:    JourneyNode[]
  complete: boolean          // true when last step is a job node
}

export type LandingFundingProgram = {
  slug:        string
  name:        string
  href:        string
  status:      string
  kind:        string
  description: string
  maxAward:    string | null
  fundedCount: number
  ecosystems:  EcoTag[]
  funder: {
    slug: string
    name: string
    href: string
  } | null
}

export type LandingRepository = {
  name:         string
  owner:        string
  fullName:     string        // "owner/name"
  href:         string        // /oss/owner/name
  ghHref:       string        // github.com link
  description:  string        // editorial note
  stars:        number
  activityTier: string
  ecoLabel:     string        // corpus eco category
  org: {
    name: string
    slug: string
    href: string
  } | null
}

export type LandingOrganization = {
  name:        string
  slug:        string
  sector:      string
  href:        string          // /ecosystem/slug
  externalHref: string         // company website
  type:        OrgType
  description: string | null
  jobCount:    number
  repoCount:   number
  totalStars:  number
  github_org:  string | null
}

export type LandingEcosystem = {
  tag:        EcoTag
  label:      string   // full display name (e.g. "AI & Machine Learning")
  shortLabel: string   // abbreviated (from ECO_LABEL — "ai", "db", etc.)
  jobCount:   number
  repoCount:  number   // repos tagged with this eco via dep/topic analysis
  jobsHref:   string   // /jobs?eco=tag
  reposHref:  string   // /oss?eco=tag
}

export type LandingCrate = {
  name:        string
  repoCount:   number   // repos in indexed corpus that depend on this crate
  pctOfCorpus: number   // repoCount / totalRepos * 100, rounded
  description: string
  href:        string   // /deps/name
}

export type LandingData = {
  graphStats:             GraphStats
  featuredJourneys:       LandingJourney[]
  featuredFundingPrograms: LandingFundingProgram[]
  featuredRepositories:   LandingRepository[]
  featuredOrganizations:  LandingOrganization[]
  featuredEcosystems:     LandingEcosystem[]
  featuredCrates:         LandingCrate[]
}

// ─── Private: ecosystem display names ─────────────────────────────────────────

const ECO_DISPLAY_NAME: Record<EcoTag, string> = {
  bevy:       "Bevy Game Engine",
  tauri:      "Tauri Desktop",
  blockchain: "Blockchain",
  embedded:   "Embedded / no_std",
  ai:         "AI & Machine Learning",
  wasm:       "WebAssembly",
  database:   "Database",
  grpc:       "gRPC & Networking",
  cli:        "CLI & TUI",
  axum:       "Web & APIs",
  tokio:      "Async / Tokio",
}

const ECO_TAG_ORDER: EcoTag[] = [
  "bevy", "tauri", "blockchain", "embedded", "ai",
  "wasm", "database", "grpc", "cli", "axum", "tokio",
]

// ─── Private: crate editorial descriptions ────────────────────────────────────
// Determines which crates are featured. Count and ordering come from data;
// these descriptions are editorial copy for known, significant crates.

const CRATE_DESCRIPTIONS: Partial<Record<string, string>> = {
  serde:       "Serialize and deserialize Rust data structures. Used across nearly every project that touches external data.",
  serde_json:  "JSON support for serde. The standard for parsing and producing JSON in Rust.",
  clap:        "Command-line argument parser. Powers the CLI surface of most Rust tools and binaries.",
  tokio:       "Async runtime for Rust. The foundation of most production network applications and services.",
  thiserror:   "Derive macro for error type definitions. Eliminates boilerplate in library error handling.",
  anyhow:      "Flexible, ergonomic error handling for Rust application code.",
  rand:        "Random number generation for Rust. From simple values to cryptographically secure randomness.",
  tracing:     "Structured, async-aware logging and diagnostics. The standard observability layer for Rust services.",
  chrono:      "Date and time types, parsing, formatting, and timezone support.",
  regex:       "Regular expression matching and searching. Fast, safe, and well-tested.",
  reqwest:     "High-level async HTTP client built on hyper. The default choice for making HTTP requests in Rust.",
  futures:     "Core async primitives and combinators — the building blocks beneath the async ecosystem.",
  axum:        "Ergonomic web framework built on tokio and hyper. Rapidly becoming the default for Rust HTTP APIs.",
  rayon:       "Data-parallelism library for CPU-bound workloads. Parallelize iterators with minimal code changes.",
  hyper:       "Fast, correct HTTP/1 and HTTP/2 implementation. The transport layer beneath axum and reqwest.",
  bytes:       "Zero-copy buffer management for networking and I/O. Used throughout the tokio and hyper stacks.",
}

// ─── Private: curated journey definitions ────────────────────────────────────
// Nodes are resolved against real data at call time; if a node cannot be
// resolved (e.g. repo removed from corpus) the journey is silently dropped.

type JourneyNodeSpec =
  | { type: "fund";  slug: string }
  | { type: "repo";  owner: string; repoName: string }
  | { type: "org";   slug: string }
  | { type: "eco";   tag: EcoTag }
  | { type: "job";   slug: string }
  | { type: "crate"; name: string }

interface JourneyDef {
  id:    string
  name:  string
  story: string
  steps: JourneyNodeSpec[]
}

// All four journeys use only verified real graph edges:
//   Journey 1: Cloudflare Workers Hackathon → pingora → cloudflare → job (periodic→repo→org→job)
//   Journey 2: qdrant/qdrant → database eco → qdrant org → job (repo→eco→org→job)
//   Journey 3: pola-rs/polars → ai eco → pola-rs org → job (repo→eco→org→job)
//   Journey 4: tokio crate (used by rerun) → rerun repo → rerun org → job (crate→repo→org→job)
const JOURNEY_DEFS: JourneyDef[] = [
  {
    id:    "funding-to-job",
    name:  "Funding Journey",
    story: "Follow a funding program from the grant all the way to the engineers it ultimately supports.",
    steps: [
      { type: "fund", slug:     "cloudflare-workers-hackathon" },
      { type: "repo", owner:    "cloudflare",  repoName: "pingora" },
      { type: "org",  slug:     "cloudflare" },
      { type: "job",  slug:     "cloudflare-distributed-systems-engineer" },
    ],
  },
  {
    id:    "repo-to-role",
    name:  "Repository Journey",
    story: "Start from a high-star repository, trace its ecosystem, and find the open role building on it.",
    steps: [
      { type: "repo", owner: "qdrant", repoName: "qdrant" },
      { type: "eco",  tag:   "database" },
      { type: "org",  slug:  "qdrant" },
      { type: "job",  slug:  "qdrant-core-rust-engineer" },
    ],
  },
  {
    id:    "ecosystem-to-role",
    name:  "Ecosystem Journey",
    story: "Enter via a domain, find the leading open-source project in it, and reach the team that's hiring.",
    steps: [
      { type: "repo", owner: "pola-rs", repoName: "polars" },
      { type: "eco",  tag:   "ai" },
      { type: "org",  slug:  "pola-rs" },
      { type: "job",  slug:  "pola-rs-performance-engineer" },
    ],
  },
  {
    id:    "dependency-to-role",
    name:  "Dependency Journey",
    story: "A crate used by 1,000+ repositories leads to the company that builds on it — and is hiring.",
    steps: [
      { type: "crate", name:     "tokio" },
      { type: "repo",  owner:    "rerun-io", repoName: "rerun" },
      { type: "org",   slug:     "rerun" },
      { type: "job",   slug:     "rerun-backend-engineer" },
    ],
  },
]

// ─── Private: module-level indexes (computed once per build) ──────────────────

type RepoIndexes = {
  ecoRepoCounts: Record<EcoTag, number>
  orgStats: Record<string, { stars: number; repoCount: number; ecoSet: Set<EcoTag> }>
}

let _repoIndexes:  RepoIndexes | null = null
let _repoLookup:   Map<string, OSSPath> | null = null

function getRepoIndexes(): RepoIndexes {
  if (_repoIndexes) return _repoIndexes

  const ownerIndex    = getOwnerCompanyIndex()
  const ecoRepoCounts: Partial<Record<EcoTag, number>> = {}
  const orgStats: Record<string, { stars: number; repoCount: number; ecoSet: Set<EcoTag> }> = {}

  for (const r of getOSSRepos()) {
    const tags = getEcoTags(r.dependencies, {
      owner:  r.owner  ?? undefined,
      topics: r.topics ?? undefined,
    })

    for (const tag of tags) {
      ecoRepoCounts[tag] = (ecoRepoCounts[tag] ?? 0) + 1
    }

    if (r.owner) {
      const company = ownerIndex.get(r.owner.toLowerCase())
      if (company) {
        const s = company.slug
        if (!orgStats[s]) orgStats[s] = { stars: 0, repoCount: 0, ecoSet: new Set() }
        orgStats[s].stars    += r.stars ?? 0
        orgStats[s].repoCount++
        for (const tag of tags) orgStats[s].ecoSet.add(tag)
      }
    }
  }

  _repoIndexes = {
    ecoRepoCounts: {
      bevy: 0, tauri: 0, blockchain: 0, embedded: 0, ai: 0,
      wasm: 0, database: 0, grpc: 0, cli: 0, axum: 0, tokio: 0,
      ...ecoRepoCounts,
    } as Record<EcoTag, number>,
    orgStats,
  }

  return _repoIndexes
}

function getRepoLookup(): Map<string, OSSPath> {
  if (!_repoLookup) {
    _repoLookup = new Map(
      getOSSRepos()
        .filter(r => r.owner)
        .map(r => [`${r.owner!.toLowerCase()}/${r.name.toLowerCase()}`, r])
    )
  }
  return _repoLookup
}

// ─── Private: active job filter ───────────────────────────────────────────────

function getActiveJobs(): EditorialJob[] {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return JOBS.filter(j => !j.expiresAt || j.expiresAt > today)
}

// ─── Private: journey node resolver ──────────────────────────────────────────
// Returns null when the referenced entity cannot be found in current data.

function resolveNode(
  spec: JourneyNodeSpec,
  opts: {
    activeJobs:     EditorialJob[]
    jobEcoCounts:   Record<EcoTag, number>
    depCounts:      Record<string, number>
    totalRepos:     number
    orgStats:       RepoIndexes["orgStats"]
  },
): JourneyNode | null {
  switch (spec.type) {
    case "fund": {
      const p = PROGRAMS.find(p => p.slug === spec.slug)
      if (!p) return null
      return {
        type:     "fund",
        label:    p.name,
        sublabel: `${(p.funded_repos ?? []).length} funded repos`,
        href:     `/grants/${p.slug}`,
      }
    }

    case "repo": {
      const key = `${spec.owner.toLowerCase()}/${spec.repoName.toLowerCase()}`
      const r   = getRepoLookup().get(key)
      if (!r) return null
      return {
        type:     "repo",
        label:    `${spec.owner}/${spec.repoName}`,
        sublabel: r.stars ? `${r.stars.toLocaleString("en-US")} stars` : "indexed repository",
        href:     `/oss/${spec.owner}/${spec.repoName}`,
      }
    }

    case "org": {
      const c = COMPANIES.find(c => c.slug === spec.slug)
      if (!c) return null
      const s = opts.orgStats[spec.slug]
      const repoLabel = s ? `${s.repoCount} repo${s.repoCount !== 1 ? "s" : ""}` : ""
      const typeLabel = c.type === "nonprofit" ? "Nonprofit" : c.type === "project" ? "Project" : "Company"
      return {
        type:     "org",
        label:    c.name,
        sublabel: [typeLabel, repoLabel].filter(Boolean).join(" · "),
        href:     `/ecosystem/${spec.slug}`,
      }
    }

    case "eco": {
      const jobCount = opts.jobEcoCounts[spec.tag] ?? 0
      return {
        type:     "eco",
        label:    ECO_DISPLAY_NAME[spec.tag],
        sublabel: `${jobCount} open role${jobCount !== 1 ? "s" : ""}`,
        href:     `/oss?eco=${spec.tag}`,
      }
    }

    case "job": {
      const j = opts.activeJobs.find(j => j.slug === spec.slug)
      if (!j) return null
      return {
        type:     "job",
        label:    j.role,
        sublabel: `${j.company}${j.remoteConfirmed ? " · Remote" : ""}`,
        href:     `/jobs/${j.slug}`,
      }
    }

    case "crate": {
      const repoCount = opts.depCounts[spec.name]
      if (!repoCount) return null
      return {
        type:     "crate",
        label:    spec.name,
        sublabel: `${repoCount.toLocaleString("en-US")} repos depend on it`,
        href:     `/deps/${spec.name}`,
      }
    }
  }
}

// ─── Exported getters ─────────────────────────────────────────────────────────

export function getGraphStats(): GraphStats {
  const repos       = getOSSRepos()
  const activeJobs  = getActiveJobs()
  const fundingLinks = PROGRAMS.reduce((n, p) => n + (p.funded_repos?.length ?? 0), 0)

  return {
    totalRepos:      repos.length,
    activeRepos:     repos.filter(r => r.activityTier === "active").length,
    totalOrgs:       COMPANIES.length,
    activeJobs:      activeJobs.length,
    totalPrograms:   PROGRAMS.length,
    rollingPrograms: PROGRAMS.filter(p => p.status === "rolling" || p.status === "open").length,
    totalFunders:    FUNDERS.length,
    fundingLinks,
    lifecycleEdges:  LIFECYCLE_EDGES.length,
  }
}

export function getFeaturedJourneys(): LandingJourney[] {
  const activeJobs   = getActiveJobs()
  const depCounts    = getDepPageCounts()
  const totalRepos   = getOSSRepos().length
  const { orgStats } = getRepoIndexes()

  const jobEcoCounts = activeJobs.reduce<Partial<Record<EcoTag, number>>>((acc, j) => {
    for (const tag of j.ecosystems ?? []) {
      acc[tag] = (acc[tag] ?? 0) + 1
    }
    return acc
  }, {}) as Record<EcoTag, number>

  const opts = { activeJobs, jobEcoCounts, depCounts, totalRepos, orgStats }

  return JOURNEY_DEFS.flatMap(def => {
    const steps: JourneyNode[] = []
    for (const spec of def.steps) {
      const node = resolveNode(spec, opts)
      if (!node) return []          // drop the whole journey if any step is missing
      steps.push(node)
    }
    const complete = steps.length > 0 && steps[steps.length - 1].type === "job"
    return [{ id: def.id, name: def.name, story: def.story, steps, complete }]
  })
}

export function getFeaturedFundingPrograms(): LandingFundingProgram[] {
  return PROGRAMS
    .filter(p =>
      (p.status === "rolling" || p.status === "open") &&
      (p.funded_repos?.length ?? 0) > 0
    )
    .sort((a, b) => (b.funded_repos?.length ?? 0) - (a.funded_repos?.length ?? 0))
    .slice(0, 6)
    .map(p => {
      const funder = getFunderBySlug(p.funder_slug)
      return {
        slug:        p.slug,
        name:        p.name,
        href:        `/grants/${p.slug}`,
        status:      p.status,
        kind:        p.kind,
        description: p.description,
        maxAward:    p.max_award ?? null,
        fundedCount: p.funded_repos?.length ?? 0,
        ecosystems:  (p.ecosystems ?? []) as EcoTag[],
        funder:      funder
          ? { slug: funder.slug, name: funder.name, href: funder.href }
          : null,
      }
    })
}

export function getFeaturedRepositories(): LandingRepository[] {
  const ownerIndex = getOwnerCompanyIndex()

  return getOSSRepos()
    .filter(r =>
      r.activityTier === "active" &&
      (r.stars ?? 0) >= 10_000 &&
      r.owner != null &&
      ownerIndex.has(r.owner.toLowerCase())
    )
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
    .slice(0, 8)
    .map(r => {
      const owner   = r.owner!
      const company = ownerIndex.get(owner.toLowerCase())!
      // href is the GitHub URL; derive /oss path from owner + name
      return {
        name:         r.name,
        owner,
        fullName:     `${owner}/${r.name}`,
        href:         `/oss/${owner}/${r.name}`,
        ghHref:       `https://github.com/${owner}/${r.name}`,
        description:  r.note,
        stars:        r.stars ?? 0,
        activityTier: r.activityTier ?? "active",
        ecoLabel:     r.eco,
        org: {
          name: company.name,
          slug: company.slug,
          href: `/ecosystem/${company.slug}`,
        },
      }
    })
}

export function getFeaturedOrganizations(): LandingOrganization[] {
  const { orgStats } = getRepoIndexes()
  const activeJobs   = getActiveJobs()

  const jobCounts = activeJobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.company_slug] = (acc[j.company_slug] ?? 0) + 1
    return acc
  }, {})

  return COMPANIES
    .filter(c => c.github_org != null && (orgStats[c.slug]?.repoCount ?? 0) > 0)
    .sort((a, b) => (orgStats[b.slug]?.stars ?? 0) - (orgStats[a.slug]?.stars ?? 0))
    .slice(0, 8)
    .map(c => {
      const s = orgStats[c.slug] ?? { stars: 0, repoCount: 0 }
      return {
        name:         c.name,
        slug:         c.slug,
        sector:       c.sector,
        href:         `/ecosystem/${c.slug}`,
        externalHref: c.href,
        type:         c.type ?? "company",
        description:  c.description ?? null,
        jobCount:     jobCounts[c.slug] ?? 0,
        repoCount:    s.repoCount,
        totalStars:   s.stars,
        github_org:   c.github_org ?? null,
      }
    })
}

export function getFeaturedEcosystems(): LandingEcosystem[] {
  const activeJobs        = getActiveJobs()
  const { ecoRepoCounts } = getRepoIndexes()

  const jobEcoCounts = activeJobs.reduce<Partial<Record<EcoTag, number>>>((acc, j) => {
    for (const tag of j.ecosystems ?? []) {
      acc[tag] = (acc[tag] ?? 0) + 1
    }
    return acc
  }, {})

  return ECO_TAG_ORDER.map(tag => ({
    tag,
    label:      ECO_DISPLAY_NAME[tag],
    shortLabel: ECO_LABEL[tag],
    jobCount:   jobEcoCounts[tag] ?? 0,
    repoCount:  ecoRepoCounts[tag],
    jobsHref:   `/jobs?eco=${tag}`,
    reposHref:  `/oss?eco=${tag}`,
  }))
}

export function getFeaturedCrates(): LandingCrate[] {
  const counts     = getDepPageCounts()
  const totalRepos = getOSSRepos().length

  return Object.entries(counts)
    .filter(([name]) => name in CRATE_DESCRIPTIONS)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, repoCount]) => ({
      name,
      repoCount,
      pctOfCorpus: Math.round((repoCount / totalRepos) * 100),
      description: CRATE_DESCRIPTIONS[name]!,
      href:        `/deps/${name}`,
    }))
}

// ─── Combined entry point ─────────────────────────────────────────────────────

export function getLandingData(): LandingData {
  return {
    graphStats:              getGraphStats(),
    featuredJourneys:        getFeaturedJourneys(),
    featuredFundingPrograms: getFeaturedFundingPrograms(),
    featuredRepositories:    getFeaturedRepositories(),
    featuredOrganizations:   getFeaturedOrganizations(),
    featuredEcosystems:      getFeaturedEcosystems(),
    featuredCrates:          getFeaturedCrates(),
  }
}
