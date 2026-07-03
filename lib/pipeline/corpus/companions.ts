/**
 * Companion crate co-occurrence - ecosystem/tech-stack knowledge: which crates
 * are commonly used alongside which others across the corpus. Ported from the
 * proven legacy scripts/build-companion-index.mjs algorithm (same thresholds).
 *
 * The legacy script produced a corpus-wide index keyed by crate name. This
 * module keeps that corpus-wide phase (buildCompanionIndex) and adds a
 * per-repo projection (companionsForRepo): the union of companions of a
 * repo's own dependencies, excluding crates it already depends on. The
 * projection is what attaches to a repo record, alongside every other Tier
 * 1/2 output.
 *
 * Pure and deterministic: ties are broken by name so output is stable.
 */

export type CompanionInput = { slug: string; dependencies: string[] }
export type Companion = { name: string; count: number; percent: number }

const MIN_REPOS = 6        // minimum repo count for a crate to qualify for the index
const MAX_COMPANIONS = 25  // top companions kept per crate in the corpus index
const MAX_REPO_COMPANIONS = 15 // top companions kept per repo projection

function bump(m: Map<string, Map<string, number>>, a: string, b: string): void {
  if (!m.has(a)) m.set(a, new Map())
  const inner = m.get(a)!
  inner.set(b, (inner.get(b) ?? 0) + 1)
}

/** Corpus-wide crate -> top companion crates, from co-occurrence across all repos. */
export function buildCompanionIndex(repos: CompanionInput[]): Map<string, Companion[]> {
  const freq = new Map<string, number>()
  for (const r of repos) for (const d of r.dependencies) freq.set(d, (freq.get(d) ?? 0) + 1)

  const qualified = new Set([...freq.entries()].filter(([, c]) => c >= MIN_REPOS).map(([d]) => d))
  const coCount = new Map<string, Map<string, number>>()

  for (const r of repos) {
    const qDeps = [...new Set(r.dependencies.filter((d) => qualified.has(d)))].sort()
    for (let i = 0; i < qDeps.length; i++) {
      for (let j = i + 1; j < qDeps.length; j++) {
        bump(coCount, qDeps[i], qDeps[j])
        bump(coCount, qDeps[j], qDeps[i])
      }
    }
  }

  const index = new Map<string, Companion[]>()
  for (const crate of [...qualified].sort()) {
    const repoCount = freq.get(crate)!
    const companions = [...(coCount.get(crate) ?? new Map()).entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_COMPANIONS)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / repoCount) * 1000) / 10 }))
    index.set(crate, companions)
  }
  return index
}

/**
 * Per-repo projection: for a repo's own dependencies, the union of their top
 * companion crates from the corpus index, excluding crates it already depends
 * on. The strongest (highest-count) companion wins when a crate is reachable
 * through more than one of the repo's dependencies.
 */
export function companionsForRepo(dependencies: string[], index: Map<string, Companion[]>): Companion[] {
  const owned = new Set(dependencies)
  const merged = new Map<string, Companion>()
  for (const dep of dependencies) {
    for (const c of index.get(dep) ?? []) {
      if (owned.has(c.name)) continue
      const existing = merged.get(c.name)
      if (!existing || c.count > existing.count) merged.set(c.name, c)
    }
  }
  return [...merged.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, MAX_REPO_COMPANIONS)
}
