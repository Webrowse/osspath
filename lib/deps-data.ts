import type { OSSPath } from "@/content/oss-paths"
import { TOPIC_ALIASES, TOPIC_DISPLAY_NAMES } from "@/lib/topic-config"
import { getCompanionIndex as _getCompanionIndex, getOSSRepos } from "@/lib/oss-data"
export type { CompanionEntry, CompanionIndex } from "@/lib/oss-data"
export { getOSSRepos, getCompanionIndex } from "@/lib/oss-data"

// Minimum global repo count for a crate to get a /deps/{crate} page.
// Must stay in sync with scripts/build-companion-index.mjs (MIN_REPOS) and
// the sitemap getDependencyUrls() function.
export const DEP_PAGE_THRESHOLD = 25

// Maximum repos rendered per dep page — keeps HTML reasonable for high-count crates.
export const DEP_MAX_REPOS = 50

// Returns all crates qualifying for a dep page, sorted by repoCount desc.
export function getQualifiedCrates(): string[] {
  const index = _getCompanionIndex()
  return Object.entries(index)
    .filter(([, v]) => v.repoCount >= DEP_PAGE_THRESHOLD)
    .sort((a, b) => b[1].repoCount - a[1].repoCount)
    .map(([name]) => name)
}

// Crates excluded from OSSCard dep links despite having a dep page.
// Only the 36 entries with repoCount >= 40 (the preferred-pool floor) are listed —
// entries below 40 never reach the preferred pool anyway.
// Grouped by category for maintainability.
export const OSSCARD_DEP_DENYLIST = new Set<string>([
  // proc-macro helpers — build-phase only, tell the reader nothing about domain
  "proc-macro2", "quote", "syn", "darling", "enum_dispatch",
  // derive helpers — generated code, not navigation targets
  "serde_derive", "strum", "strum_macros", "napi-derive",
  // test infrastructure — dev-dependency surface
  "criterion", "pretty_assertions", "insta", "assert_cmd", "serial_test",
  "rstest", "static_assertions", "wiremock", "test-case", "tracing-test",
  "pprof", "testcontainers", "mockito",
  // fuzzing infrastructure
  "arbitrary", "libfuzzer-sys",
  // build / codegen — only active during cargo build, not at runtime
  "clap_complete", "clap_mangen", "cc", "prost-build", "tonic-build", "bindgen",
  // sys bindings and low-level impl detail
  "openssl", "rand_core", "serde_bytes", "fnv", "terminal_size", "objc2-app-kit",
])

// Returns { crate → total-star-weight } for every dep across all repos.
// Star-weight = sum of stars of all repos that use the dep.
// Cached at module level — computed from the oss.json corpus.
let _depStarWeights: Record<string, number> | null = null
export function getDepStarWeights(): Record<string, number> {
  if (!_depStarWeights) {
    _depStarWeights = {}
    for (const r of getOSSRepos()) {
      for (const d of r.dependencies ?? []) {
        _depStarWeights[d] = (_depStarWeights[d] ?? 0) + (r.stars ?? 0)
      }
    }
  }
  return _depStarWeights
}

// Returns { crate → repoCount } for every crate with a dep page that is not
// on the denylist. Used by OSSCard to filter and rank dep links.
// Cached at module level — derived from the already-cached companion index.
let _depPageCounts: Record<string, number> | null = null
export function getDepPageCounts(): Record<string, number> {
  if (!_depPageCounts) {
    _depPageCounts = {}
    for (const [name, entry] of Object.entries(_getCompanionIndex())) {
      if (entry.repoCount >= DEP_PAGE_THRESHOLD && !OSSCARD_DEP_DENYLIST.has(name)) {
        _depPageCounts[name] = entry.repoCount
      }
    }
  }
  return _depPageCounts
}

// ── Topic affinity ─────────────────────────────────────────────────────────────

const DEP_TOPIC_THRESHOLD = 40

// Reverse alias map: raw topic tag → canonical slug. Built once at module init.
const _tagToCanonical: Record<string, string> = {}
for (const canonical of Object.keys(TOPIC_DISPLAY_NAMES)) {
  _tagToCanonical[canonical] = canonical
}
for (const [canonical, aliases] of Object.entries(TOPIC_ALIASES)) {
  for (const alias of aliases) _tagToCanonical[alias] = canonical
}

// Returns canonical topic slugs that have ≥40% coverage among the given repos.
// Pass allRepos (not the sliced topRepos) for accurate percentages.
export function getDepTopicAffinity(repos: OSSPath[]): string[] {
  if (!repos.length) return []
  const counts: Record<string, number> = {}
  for (const repo of repos) {
    const seen = new Set<string>()
    for (const tag of repo.topics ?? []) {
      const canonical = _tagToCanonical[tag]
      if (canonical && !seen.has(canonical)) {
        counts[canonical] = (counts[canonical] ?? 0) + 1
        seen.add(canonical)
      }
    }
  }
  return Object.entries(counts)
    .filter(([, n]) => Math.round((n / repos.length) * 100) >= DEP_TOPIC_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic)
}
