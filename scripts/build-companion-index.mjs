/**
 * Companion crate index builder.
 * Reads content/oss.json, computes co-occurrence for every dependency that
 * appears in >= MIN_REPOS repositories, and writes a keyed index to
 * content/oss-companion-index.json.
 *
 * Usage:
 *   node scripts/build-companion-index.mjs
 */

import { readFileSync, writeFileSync, statSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, "..")

const MIN_REPOS      = 6   // minimum repo count to qualify for the index
const MAX_COMPANIONS = 25  // top companions kept per crate

const OSS_FILE   = join(ROOT, "content", "oss.json")
const OUT_FILE   = join(ROOT, "content", "oss-companion-index.json")

const t0 = Date.now()

// ── Load corpus ────────────────────────────────────────────────────────────────
const repos = JSON.parse(readFileSync(OSS_FILE, "utf-8"))
console.log(`Loaded ${repos.length} repos from content/oss.json`)

// ── Step 1: global dep frequency ──────────────────────────────────────────────
const freq = {}
for (const repo of repos) {
  for (const dep of repo.dependencies ?? []) {
    freq[dep] = (freq[dep] ?? 0) + 1
  }
}

const uniqueTotal = Object.keys(freq).length
const qualified   = new Set(Object.entries(freq).filter(([, c]) => c >= MIN_REPOS).map(([d]) => d))
const ge2         = Object.entries(freq).filter(([, c]) => c >= 2).length
const singletons  = Object.entries(freq).filter(([, c]) => c === 1).length

console.log(`\nDependency frequency breakdown:`)
console.log(`  Total unique deps:       ${uniqueTotal}`)
console.log(`  Appearing in >= 2 repos: ${ge2}`)
console.log(`  Appearing in >= 6 repos: ${qualified.size}  ← index + default facet`)
console.log(`  Singletons (1 repo):     ${singletons}`)
console.log(`  Hidden from search:      ${singletons} (${(singletons/uniqueTotal*100).toFixed(1)}%)`)
console.log(`  Hidden from default:     ${uniqueTotal - qualified.size} (${((uniqueTotal - qualified.size)/uniqueTotal*100).toFixed(1)}%)`)

// ── Step 2: co-occurrence matrix (qualified deps only) ────────────────────────
//
// For each repo, collect the subset of its deps that are qualified,
// then increment the co-count for every pair.  Only qualified↔qualified pairs
// are tracked — this keeps the matrix bounded and excludes noise.
const coCount = {}  // coCount[a][b] = repos containing both a and b

for (const repo of repos) {
  const qDeps = (repo.dependencies ?? []).filter(d => qualified.has(d))
  for (let i = 0; i < qDeps.length; i++) {
    const a = qDeps[i]
    if (!coCount[a]) coCount[a] = {}
    for (let j = i + 1; j < qDeps.length; j++) {
      const b = qDeps[j]
      coCount[a][b] = (coCount[a][b] ?? 0) + 1
      if (!coCount[b]) coCount[b] = {}
      coCount[b][a] = (coCount[b][a] ?? 0) + 1
    }
  }
}

// ── Step 3: build index ────────────────────────────────────────────────────────
const index = {}

for (const crate of [...qualified].sort()) {
  const repoCount    = freq[crate]
  const companions   = Object.entries(coCount[crate] ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_COMPANIONS)
    .map(([name, count]) => ({
      name,
      count,
      percent: parseFloat((count / repoCount * 100).toFixed(1)),
    }))

  index[crate] = { repoCount, companions }
}

// ── Write output ───────────────────────────────────────────────────────────────
writeFileSync(OUT_FILE, JSON.stringify(index, null, 2) + "\n", "utf-8")

const elapsed   = Date.now() - t0
const sizeBytes = statSync(OUT_FILE).size
const sizeKB    = (sizeBytes / 1024).toFixed(1)

// ── Report ─────────────────────────────────────────────────────────────────────
console.log(`\n════════════════════════════════`)
console.log(`  COMPANION INDEX REPORT`)
console.log(`════════════════════════════════`)
console.log(`Output:          ${OUT_FILE}`)
console.log(`File size:       ${sizeKB} KB`)
console.log(`Crates indexed:  ${Object.keys(index).length}`)
console.log(`Generation time: ${elapsed} ms`)

console.log(`\nTop 20 companion relationships (highest raw count):`)
const allPairs = []
for (const [crate, { repoCount, companions }] of Object.entries(index)) {
  for (const c of companions) {
    allPairs.push({ a: crate, b: c.name, count: c.count, pct: c.percent, srcRepos: repoCount })
  }
}
allPairs.sort((a, b) => b.count - a.count)
const seen = new Set()
let shown = 0
for (const { a, b, count, pct } of allPairs) {
  const key = [a, b].sort().join("↔")
  if (seen.has(key)) continue
  seen.add(key)
  console.log(`  ${a} ↔ ${b}`.padEnd(50) + `${count} repos  ${pct}%`)
  if (++shown >= 20) break
}
