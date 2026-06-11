/**
 * Compute Jaccard-based repository similarity from dependency sets.
 * Writes content/oss-similar.json — top-10 similar repos per repo.
 *
 * Usage: node scripts/compute-similarity.mjs
 */

import { readFileSync, writeFileSync, statSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

const UBIQUITOUS = new Set([
  "serde", "serde_json", "clap", "tokio", "thiserror", "anyhow",
  "rand", "chrono", "tracing", "log", "tempfile", "futures",
  "once_cell", "lazy_static",
])

const K          = 10
const MIN_SCORE  = 0.07  // skip pairs below this combined score
const MIN_SIGNAL = 2     // minimum non-ubiquitous deps required to be indexed

const t0 = Date.now()

const repos = JSON.parse(readFileSync(join(ROOT, "content/oss.json"), "utf-8"))
console.log(`Loaded ${repos.length} repos`)

// Build dep sets (non-ubiquitous deps only)
const slugToSet  = {}  // slug → Set<string>
const slugToData = {}  // slug → { owner, name, stars }
const slugs      = []

for (const r of repos) {
  if (!r.owner || !r.name) continue
  const deps = (r.dependencies ?? []).filter(d => !UBIQUITOUS.has(d))
  if (deps.length < MIN_SIGNAL) continue
  const slug = `${r.owner}/${r.name}`
  slugToSet[slug]  = new Set(deps)
  slugToData[slug] = { owner: r.owner, name: r.name, stars: r.stars ?? 0 }
  slugs.push(slug)
}

console.log(`Indexed ${slugs.length} repos with >= ${MIN_SIGNAL} signal deps`)

// O(n²) pairwise similarity
const similar = {}
let pairs = 0

for (let i = 0; i < slugs.length; i++) {
  const a    = slugs[i]
  const setA = slugToSet[a]
  const scores = []

  for (let j = 0; j < slugs.length; j++) {
    if (i === j) continue
    const b    = slugs[j]
    const setB = slugToSet[b]

    // Fast pre-check: need at least 2 shared deps
    let inter = 0
    for (const d of setA) {
      if (setB.has(d)) {
        inter++
        if (inter >= 2) break // enough to pass pre-check
      }
    }
    if (inter < 2) {
      // Re-check exact count for single-intersection cases
      inter = 0
      for (const d of setA) {
        if (setB.has(d)) inter++
      }
      if (inter === 0) continue
    } else {
      // Full intersection
      inter = 0
      for (const d of setA) {
        if (setB.has(d)) inter++
      }
    }

    const union   = setA.size + setB.size - inter
    const jaccard = inter / union
    const overlap = inter / Math.min(setA.size, setB.size)
    const score   = 0.7 * jaccard + 0.3 * overlap

    if (score >= MIN_SCORE) {
      scores.push({ repo: b, score: +score.toFixed(3) })
      pairs++
    }
  }

  if (scores.length > 0) {
    scores.sort((a, b) => b.score - a.score)
    similar[a] = scores.slice(0, K)
  }

  if (i % 200 === 0 && i > 0) {
    process.stdout.write(`  ${i}/${slugs.length}…\r`)
  }
}

const OUT_FILE = join(ROOT, "content/oss-similar.json")
writeFileSync(OUT_FILE, JSON.stringify(similar) + "\n", "utf-8")

const elapsed   = ((Date.now() - t0) / 1000).toFixed(1)
const sizeKB    = (statSync(OUT_FILE).size / 1024).toFixed(0)
const covered   = Object.keys(similar).length

console.log(`\n═══════════════════════════════`)
console.log(`  SIMILARITY INDEX REPORT`)
console.log(`═══════════════════════════════`)
console.log(`Output:        content/oss-similar.json`)
console.log(`File size:     ${sizeKB} KB`)
console.log(`Repos covered: ${covered} / ${slugs.length}`)
console.log(`Pairs stored:  ${pairs}`)
console.log(`Elapsed:       ${elapsed}s`)
