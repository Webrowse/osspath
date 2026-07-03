/**
 * Guard for Search 2.0 (lib/pipeline/search/*).
 * Pure functions, synthetic fixtures, no DB, no network.
 * Run: tsx scripts/check-search-index.ts
 */
import { buildSearchIndex } from "@/lib/pipeline/search/index-builder"
import { queryRepos } from "@/lib/pipeline/search/query"
import type { SearchCorpus, SearchIndex } from "@/lib/pipeline/search/types"

let failed = 0
function assert(label: string, cond: boolean) { if (!cond) { console.error(`x ${label}`); failed++ } }

// A small corpus covering every example product question from the milestone.
const corpus: SearchCorpus = {
  repos: [
    {
      // "Show mature backend frameworks": web ecosystem, high stars, active.
      slug: "tokio-rs/axum", name: "axum", href: "https://github.com/tokio-rs/axum",
      stars: 18000, activityTier: "active",
      cargo: { license: "MIT", msrv: "1.75", isWorkspace: true, hasLockfile: true, categories: ["web-programming::http-server"], keywords: ["http", "web", "framework"], dependencies: ["tokio", "tower", "hyper"] },
      ecosystemIntelligence: { ecosystems: ["web", "async"], technologies: ["Axum", "Tower"], domain: "web", confidence: 0.83 },
      relationships: { similar: ["someone/api-server"], companions: ["hyper", "serde"] },
    },
    {
      // "Show active embedded projects".
      slug: "rust-embedded/cortex-m", name: "cortex-m", href: "https://github.com/rust-embedded/cortex-m",
      stars: 900, activityTier: "active",
      cargo: { license: "MIT OR Apache-2.0", msrv: null, isWorkspace: false, hasLockfile: false, categories: ["embedded", "no-std"], keywords: ["embedded", "cortex-m"], dependencies: ["embedded-hal"] },
      ecosystemIntelligence: { ecosystems: ["embedded"], technologies: ["embedded-hal"], domain: "embedded", confidence: 0.5 },
      relationships: { similar: [], companions: [] },
    },
    {
      // "Show SQLx repositories using Tokio" + "Show repositories similar to axum".
      slug: "someone/api-server", name: "api-server", href: "https://github.com/someone/api-server",
      stars: 400, activityTier: "maintenance",
      cargo: { license: "Apache-2.0", msrv: null, isWorkspace: false, hasLockfile: true, categories: ["database"], keywords: [], dependencies: ["sqlx", "tokio"] },
      ecosystemIntelligence: { ecosystems: ["web", "database"], technologies: ["SQLx"], domain: "database", confidence: 0.33 },
      relationships: { similar: [], companions: [] },
    },
    {
      // Dormant, no company - a negative control for activity/company filters.
      slug: "abandoned/old-crate", name: "old-crate", href: "https://github.com/abandoned/old-crate",
      stars: 50, activityTier: "dormant",
      cargo: { license: "MIT", msrv: null, isWorkspace: false, hasLockfile: false, categories: [], keywords: [], dependencies: ["tokio"] },
      ecosystemIntelligence: { ecosystems: ["async"], technologies: [], domain: "async", confidence: 0.33 },
      relationships: { similar: [], companions: [] },
    },
    {
      // No Tier 1 manifest, no Tier 2 signal at all - must not crash the builder.
      slug: "nobody/no-manifest", name: "no-manifest", href: "https://github.com/nobody/no-manifest",
      stars: 5, activityTier: null,
    },
  ],
  companyByRepoSlug: new Map([
    ["tokio-rs/axum", { slug: "tokio", name: "Tokio Project" }],
  ]),
}

const { repos, facets } = buildSearchIndex(corpus)
const index: SearchIndex = { version: 1, computedAt: "2026-01-01T00:00:00.000Z", repos, facets }

// ── Builder correctness ──────────────────────────────────────────────────────
assert("every repo produces a record, including one with no Tier 1/2 data", repos.length === 5)
assert("no-manifest repo gets safe defaults, not a crash", repos.find((r) => r.slug === "nobody/no-manifest")?.dependencies.length === 0)
assert("facets.ecosystems is deduplicated and sorted", JSON.stringify(facets.ecosystems) === JSON.stringify([...new Set(facets.ecosystems)].sort()))
assert("facets.companies only lists companies actually present", facets.companies.length === 1 && facets.companies[0].slug === "tokio")

// ── Determinism ───────────────────────────────────────────────────────────────
{
  const again = buildSearchIndex(corpus)
  assert("same corpus twice -> byte-identical repos+facets", JSON.stringify({ repos, facets }) === JSON.stringify(again))
}

// ── Product question 1: "Show mature backend frameworks" ────────────────────
{
  const results = queryRepos(index, { ecosystems: ["web"], activityTier: "active", minStars: 5000 })
  assert("mature backend frameworks -> axum matches", results.some((r) => r.slug === "tokio-rs/axum"))
  assert("mature backend frameworks -> low-star/dormant repos excluded", !results.some((r) => r.slug === "abandoned/old-crate"))
}

// ── Product question 2: "Show active embedded projects" ─────────────────────
{
  const results = queryRepos(index, { ecosystems: ["embedded"], activityTier: "active" })
  assert("active embedded -> cortex-m matches", results.length === 1 && results[0].slug === "rust-embedded/cortex-m")
}

// ── Product question 3: "Show SQLx repositories using Tokio" (AND across deps) ──
{
  const results = queryRepos(index, { dependencies: ["sqlx", "tokio"] })
  assert("sqlx AND tokio -> only api-server (axum has no sqlx)", results.length === 1 && results[0].slug === "someone/api-server")
}

// ── Product question 4: "Show repositories similar to X" ────────────────────
{
  const results = queryRepos(index, { similarTo: "tokio-rs/axum" })
  assert("similar to axum -> returns api-server (from relationships.similar)", results.length === 1 && results[0].slug === "someone/api-server")
}
{
  const results = queryRepos(index, { similarTo: "unknown/repo" })
  assert("similar to an unknown repo -> empty, not a crash", results.length === 0)
}

// ── Product question 5: "Show projects from company Y" ───────────────────────
{
  const results = queryRepos(index, { companySlug: "tokio" })
  assert("company tokio -> only axum (the only repo with a graph-matched company)", results.length === 1 && results[0].slug === "tokio-rs/axum")
}

// ── Product question 6: "Show repositories in ecosystem Z" ──────────────────
{
  const results = queryRepos(index, { ecosystems: ["database"] })
  assert("ecosystem database -> api-server matches", results.some((r) => r.slug === "someone/api-server"))
  assert("ecosystem database -> cortex-m excluded", !results.some((r) => r.slug === "rust-embedded/cortex-m"))
}

// ── Combination: filters compose with AND across facets ─────────────────────
// axum also has ecosystem "web" and depends on tokio, so a "web OR database"
// filter alone would match both axum and api-server; narrowing to "database"
// (which only api-server has) plus a dependency and a star floor proves the
// facets are ANDed together, not just the last filter silently winning.
{
  const results = queryRepos(index, { ecosystems: ["database"], dependencies: ["tokio"], minStars: 100 })
  assert("compound query narrows correctly", results.length === 1 && results[0].slug === "someone/api-server")
}

// ── "Show beginner-friendly repositories" - HONEST LIMITATION, not a real facet ──
// goodFirstIssuesCount/helpWantedIssuesCount are dead fields (GitHub REST API
// never returns them; OSSPath marks both @deprecated, always 0), so there is no
// genuine beginner-friendliness signal in current Tier 1/2 data. Building one
// would be new enrichment logic, out of scope for this milestone. The closest
// honest proxy from REAL fields is active + lower complexity (fewer stars can
// mean a smaller, more approachable codebase) - demonstrated here as a
// combination a user CAN construct, explicitly not claimed as "beginner-friendly".
{
  const results = queryRepos(index, { activityTier: "active", minStars: 0 })
  assert("active-project combination query still works (no fabricated beginner facet)", results.length === 2)
}

if (failed) { console.error(`\n${failed} assertion(s) failed`); process.exit(1) }
console.log("ok - search 2.0: index builder is deterministic and every example product query is answerable")
