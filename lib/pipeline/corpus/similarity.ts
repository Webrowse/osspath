/**
 * Repository similarity via weighted Jaccard + overlap coefficient on
 * non-ubiquitous Cargo dependency sets. Ported from the proven legacy
 * scripts/compute-similarity.mjs algorithm (same weights, thresholds, and
 * ubiquitous-crate exclusion list), so the domain-tuned scoring carries over
 * unchanged. This Tier 2 processor computes it from the `dependencies` field
 * Tier 1 already writes to Postgres, rather than a standalone JSON artifact.
 *
 * Pure and deterministic: identical input always yields identical, sorted
 * output (ties broken by repo slug), so re-running over an unchanged corpus
 * produces byte-identical results and no spurious writes downstream.
 */

export type SimilarityInput = { slug: string; dependencies: string[] }
export type SimilarEntry = { repo: string; score: number }

const UBIQUITOUS = new Set([
  "serde", "serde_json", "clap", "tokio", "thiserror", "anyhow",
  "rand", "chrono", "tracing", "log", "tempfile", "futures",
  "once_cell", "lazy_static",
])

const TOP_K = 10
const MIN_SCORE = 0.07
const MIN_SIGNAL = 2 // minimum non-ubiquitous deps required to be indexed

/** Top-K similar repos for every repo with enough dependency signal. */
export function computeSimilarity(repos: SimilarityInput[]): Map<string, SimilarEntry[]> {
  const sets = new Map<string, Set<string>>()
  for (const r of repos) {
    const deps = r.dependencies.filter((d) => !UBIQUITOUS.has(d))
    if (deps.length >= MIN_SIGNAL) sets.set(r.slug, new Set(deps))
  }
  const slugs = [...sets.keys()].sort()

  const result = new Map<string, SimilarEntry[]>()
  for (let i = 0; i < slugs.length; i++) {
    const a = slugs[i]
    const setA = sets.get(a)!
    const scores: SimilarEntry[] = []

    for (let j = 0; j < slugs.length; j++) {
      if (i === j) continue
      const b = slugs[j]
      const setB = sets.get(b)!
      let inter = 0
      for (const d of setA) if (setB.has(d)) inter++
      if (inter === 0) continue

      const union = setA.size + setB.size - inter
      const jaccard = inter / union
      const overlap = inter / Math.min(setA.size, setB.size)
      const score = Math.round((0.7 * jaccard + 0.3 * overlap) * 1000) / 1000
      if (score >= MIN_SCORE) scores.push({ repo: b, score })
    }

    scores.sort((x, y) => y.score - x.score || x.repo.localeCompare(y.repo))
    if (scores.length > 0) result.set(a, scores.slice(0, TOP_K))
  }
  return result
}
