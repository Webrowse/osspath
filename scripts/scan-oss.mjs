/**
 * Standalone OSS scanner — mirrors scanGitHubOSS() in lib/admin/scanners.ts exactly.
 * Runs outside Next.js, no auth check.
 *
 * Usage:
 *   node scripts/scan-oss.mjs            # full run, writes to data/pending/oss.json
 *   DRY_RUN=1 node scripts/scan-oss.mjs  # discovery + report only, no writes
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const DRY_RUN = process.env.DRY_RUN === "1"

// ── Load .env.local ───────────────────────────────────────────────────────────
try {
  const env = readFileSync(join(ROOT, ".env.local"), "utf-8")
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
  }
} catch { /* no .env.local */ }

const TOKEN = process.env.GITHUB_TOKEN
const GH_HEADERS = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "jobs.adarshrust.com/scanner",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
}

console.log(TOKEN ? `✓ GITHUB_TOKEN loaded (${TOKEN.slice(0, 8)}…)` : "⚠ No GITHUB_TOKEN — rate limited to 60 req/h")
console.log(DRY_RUN ? "DRY RUN — no files will be written\n" : "LIVE RUN — will write to data/pending/oss.json\n")

// ── Storage helpers ───────────────────────────────────────────────────────────
function readJSON(rel) {
  const p = join(ROOT, rel)
  if (!existsSync(p)) return []
  try { return JSON.parse(readFileSync(p, "utf-8").trim() || "[]") } catch { return [] }
}

function writeJSON(rel, data) {
  const p = join(ROOT, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf-8")
}

function addPendingItems(newItems) {
  const existing = readJSON("data/pending/oss.json")
  const existingIds = new Set(existing.map(i => i.id))
  const unique = newItems.filter(i => !existingIds.has(i.id))
  if (!DRY_RUN) writeJSON("data/pending/oss.json", [...existing, ...unique])
  return unique.length
}

// ── GitHub helpers ────────────────────────────────────────────────────────────
async function ghFetch(url) {
  const res = await fetch(url, { headers: GH_HEADERS, signal: AbortSignal.timeout(25_000) })
  if (res.status === 403) throw new Error(`Rate-limited (403): ${url}`)
  if (res.status === 422) throw new Error(`Invalid query (422): ${url}`)
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${url}`)
  return res.json()
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function searchPage(query, page) {
  try {
    const data = await ghFetch(
      `https://api.github.com/search/repositories?q=${query}&sort=updated&per_page=100&page=${page}`
    )
    return data?.items ?? []
  } catch (e) {
    console.error(`  ✗ search page ${page}: ${e.message}`)
    return []
  }
}

// ── Quality filter (mirrors ossJunkFilter in scanners.ts) ─────────────────────
function isJunk(r) {
  if (r.archived || r.disabled) return { junk: true, reason: "archived or disabled" }
  if ((r.stargazers_count ?? 0) < 20) return { junk: true, reason: "under 20 stars" }

  const nameLc = r.name.toLowerCase()
  const descLc = (r.description ?? "").toLowerCase()

  if (nameLc.startsWith("awesome-") || nameLc.startsWith("awesome_") || nameLc === "awesome")
    return { junk: true, reason: "awesome-list" }
  if (/^(list-of|curated|resources|links)-/.test(nameLc))
    return { junk: true, reason: "resource list" }
  if (descLc.includes("curated list") || descLc.includes("a list of") ||
      descLc.includes("collection of resources") || descLc.includes("a collection of awesome"))
    return { junk: true, reason: "curated list (description)" }

  if (/-(tutorial|tutorials|guide|guides|course|courses|workshop|workshops|book|exercises|kata)s?$/.test(nameLc))
    return { junk: true, reason: "learning resource" }
  if (/^(learn|learning|tutorial|guide|course|workshop|book|study)-/.test(nameLc))
    return { junk: true, reason: "learning resource" }

  if (nameLc === "docs" || nameLc === "documentation" || nameLc.endsWith("-docs") || nameLc.endsWith(".github.io"))
    return { junk: true, reason: "documentation repo" }
  if (descLc.startsWith("mirror of") || descLc.startsWith("[mirror]") || descLc.includes("auto-mirror"))
    return { junk: true, reason: "mirror repository" }
  if (nameLc.endsWith("-mirror") || nameLc.startsWith("mirror-"))
    return { junk: true, reason: "mirror repository" }
  if (r.size === 0) return { junk: true, reason: "empty repository" }

  return { junk: false, reason: "" }
}

function activityTier(pushedAt) {
  if (!pushedAt) return "dormant"
  const days = (Date.now() - new Date(pushedAt).getTime()) / 86_400_000
  if (days <= 30) return "active"
  if (days <= 90) return "maintenance"
  return "dormant"
}

function inferEco(topics, name, desc) {
  const lc = [topics.join(" "), name, desc].join(" ").toLowerCase()
  if (lc.includes("tui") || lc.includes("terminal")) return "UI · TUI"
  if (lc.includes("cli") || lc.includes("command-line")) return "CLI · Tooling"
  if (lc.includes("embedded") || lc.includes("no_std") || lc.includes("embassy") || lc.includes("rtos")) return "Embedded · no_std"
  if (lc.includes("parser") || lc.includes("parsing") || lc.includes("nom") || lc.includes("pest")) return "Parsing · Libraries"
  if (lc.includes("wasm") || lc.includes("webassembly") || lc.includes("wasmtime")) return "WASM · Runtime"
  if (lc.includes("crypto") || lc.includes("security") || lc.includes("tls") || lc.includes("cipher")) return "Security · Crypto"
  if (lc.includes("game") || lc.includes("bevy") || lc.includes("engine") || lc.includes("rendering")) return "Game · Graphics"
  if (lc.includes("http") || lc.includes("axum") || lc.includes("actix") || lc.includes("web server")) return "Web · HTTP"
  if (lc.includes("database") || lc.includes("sql") || lc.includes("diesel") || lc.includes("sqlx")) return "Database · Storage"
  if (lc.includes("async") || lc.includes("tokio") || lc.includes("futures") || lc.includes("runtime")) return "Async · Runtime"
  if (lc.includes("network") || lc.includes("socket") || lc.includes("hyper") || lc.includes("grpc") || lc.includes("tonic")) return "Networking"
  return "Libraries · General"
}

function buildExtracted(r) {
  const tier = activityTier(r.pushed_at)
  const topics = r.topics ?? []
  const eco = inferEco(topics, r.name, r.description ?? "")
  return {
    name: r.name,
    eco,
    href: r.html_url,
    note: r.description ?? "",
    topics,
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
    openIssuesCount: r.open_issues_count ?? 0,
    goodFirstIssuesCount: r.good_first_issues_count ?? 0,
    helpWantedIssuesCount: r.help_wanted_issues_count ?? 0,
    language: r.language ?? null,
    owner: r.owner?.login ?? "",
    license: r.license?.spdx_id ?? null,
    pushedAt: r.pushed_at ?? "",
    activityTier: tier,
    maintainerFriendliness: 0.5, issueQuality: 0.5, beginnerSuitability: 0.5,
    maintainerLabel: "", issueLabel: `${r.open_issues_count ?? 0} open issues`, beginnerLabel: "",
    ecosystem: [], beginnerFriendly: (r.good_first_issues_count ?? 0) > 0,
    queue: true, skipReason: "",
  }
}

// ── Config (mirrors scanners.ts exactly) ─────────────────────────────────────
const since365 = new Date(Date.now() - 365 * 86_400_000).toISOString().split("T")[0]

const SEARCH_QUERIES = [
  { label: "stars:20-99",        q: `language:Rust+stars:20..99+pushed:>${since365}` },
  { label: "stars:100-499",      q: `language:Rust+stars:100..499+pushed:>${since365}` },
  { label: "stars:500-1999",     q: `language:Rust+stars:500..1999+pushed:>${since365}` },
  { label: "stars:2000-9999",    q: `language:Rust+stars:2000..9999+pushed:>${since365}` },
  { label: "stars:10000+",       q: `language:Rust+stars:>=10000` },
  { label: "good-first-issues",  q: `language:Rust+good-first-issues:>0+stars:>=20+pushed:>${since365}` },
  { label: "help-wanted",        q: `language:Rust+help-wanted-issues:>0+stars:>=20+pushed:>${since365}` },
  { label: "topic:embedded",     q: `language:Rust+topic:embedded+stars:>=20` },
  { label: "topic:webassembly",  q: `language:Rust+topic:webassembly+stars:>=20` },
  { label: "topic:async-rust",   q: `language:Rust+topic:async-rust+stars:>=20` },
  { label: "topic:database",     q: `language:Rust+topic:database+stars:>=20` },
  { label: "topic:command-line", q: `language:Rust+topic:command-line+stars:>=20` },
]

const RUST_ORGS = [
  "rust-lang", "rust-cli", "tokio-rs", "hyperium", "smol-rs", "quinn-rs", "libp2p",
  "embassy-rs", "oxidecomputer", "redox-os", "rustwasm", "bytecodealliance", "fermyon", "wasmerio",
  "tauri-apps", "slint-ui", "bevyengine", "linebender", "diesel-rs", "serde-rs", "rayon-rs",
  "PyO3", "pola-rs", "tracel-ai", "lance-format", "meilisearch", "qdrant", "paradedb",
  "databend-labs", "risingwavelabs", "quickwit-oss", "GreptimeTeam", "pgcentralfoundation",
  "vectordotdev", "rerun-io", "gitbutlerapp", "nushell", "zellij-org", "astral-sh", "prefix-dev",
  "jj-vcs", "denoland", "firecracker-microvm", "awslabs", "cloudflare", "microsoft", "google",
  "mozilla", "tikv", "pingcap", "apache", "cachix",
]

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const startedAt = Date.now()

  // Build dedup sets
  const existingIds   = new Set()
  const existingHrefs = new Set()
  const pending  = readJSON("data/pending/oss.json")
  const content  = readJSON("content/oss.json")
  const rejected = readJSON("data/rejected/oss.json")

  for (const item of pending)  { existingIds.add(item.id); if (item.sourceUrl) existingHrefs.add(item.sourceUrl) }
  for (const item of content)  { const h = String(item.href ?? ""); if (h) existingHrefs.add(h) }
  // Also dedup against approved items in rejected file (they're in content already)
  for (const item of rejected) { if (item.sourceUrl) existingHrefs.add(item.sourceUrl) }

  console.log(`Corpus state: ${content.length} published | ${pending.length} pending | ${rejected.length} archived\n`)

  const rawRepos = []
  const seenIds  = new Set()

  function ingest(r) {
    if (seenIds.has(r.id)) return
    if (r.archived || r.disabled) return
    seenIds.add(r.id)
    rawRepos.push(r)
  }

  // ── Phase 1: Search ────────────────────────────────────────────────────────
  console.log("═══ Phase 1: GitHub Search API ══════════════════════════════")
  const searchStats = {}

  for (const { label, q } of SEARCH_QUERIES) {
    let count = 0
    for (let page = 1; page <= 2; page++) {
      process.stdout.write(`  ${label} page ${page}… `)
      const items = await searchPage(q, page)
      items.forEach(r => ingest(r))
      count += items.length
      process.stdout.write(`${items.length} results\n`)
      if (items.length < 100) break
      if (page < 2) await sleep(2000)
    }
    searchStats[label] = count
  }

  const searchTotal = Object.values(searchStats).reduce((a, b) => a + b, 0)
  console.log(`\nSearch total: ${searchTotal} results, ${rawRepos.length} unique after in-session dedup\n`)

  // ── Phase 2: Org scans ────────────────────────────────────────────────────
  console.log("═══ Phase 2: Organization Scans ═════════════════════════════")
  const orgStats = {}
  const ORG_BATCH = 10

  for (let i = 0; i < RUST_ORGS.length; i += ORG_BATCH) {
    const batch = RUST_ORGS.slice(i, i + ORG_BATCH)
    const results = await Promise.allSettled(
      batch.map(org =>
        ghFetch(`https://api.github.com/orgs/${org}/repos?type=public&sort=pushed&per_page=100`)
          .then(data => ({ org, repos: Array.isArray(data) ? data : [] }))
          .catch(e => { console.error(`  ✗ ${org}: ${e.message.slice(0, 60)}`); return { org, repos: [] } })
      )
    )
    for (const r of results) {
      if (r.status === "rejected") continue
      const { org, repos } = r.value
      let added = 0
      for (const repo of repos) {
        if (repo.language && repo.language !== "Rust") continue
        ingest(repo)
        added++
      }
      if (added > 0) { orgStats[org] = added; process.stdout.write(`  ${org}: ${added}\n`) }
    }
  }

  const orgTotal = Object.values(orgStats).reduce((a, b) => a + b, 0)
  const beforeOrgDedup = rawRepos.length
  console.log(`\nOrg total: ${orgTotal} Rust repos → ${rawRepos.length} unique cumulative\n`)

  // ── Phase 3: Quality filter ───────────────────────────────────────────────
  console.log("═══ Phase 3: Quality Filter ═════════════════════════════════")
  let dupCount      = 0
  let junkCount     = 0
  const junkReasons = {}
  const toQueue     = []

  for (const r of rawRepos) {
    const id = `gh-${r.id}`
    if (existingIds.has(id) || existingHrefs.has(r.html_url)) { dupCount++; continue }
    const { junk, reason } = isJunk(r)
    if (junk) { junkCount++; junkReasons[reason] = (junkReasons[reason] ?? 0) + 1; continue }
    const stars = r.stargazers_count ?? 0
    const confidence = Math.min(0.9, 0.5 + Math.log10(Math.max(1, stars)) / 10)
    toQueue.push({
      id,
      type: "oss",
      status: "pending",
      source: "github-oss",
      sourceUrl: r.html_url,
      foundAt: new Date().toISOString(),
      confidence,
      whyMatched: `${activityTier(r.pushed_at)} · ★${stars} · ${r.owner?.login ?? ""}`,
      rawText: `${r.full_name}: ${r.description ?? ""}`,
      extracted: buildExtracted(r),
    })
  }

  const added = addPendingItems(toQueue)

  console.log(`  Unique repos found:   ${rawRepos.length}`)
  console.log(`  Already in corpus:    ${dupCount}`)
  console.log(`  Quality rejected:     ${junkCount}`)
  console.log(`  Quality rules fired:`)
  Object.entries(junkReasons).sort((a,b)=>b[1]-a[1]).forEach(([r,n])=>console.log(`    ${r}: ${n}`))
  console.log(`  Eligible for queue:   ${toQueue.length}`)
  console.log(`  Newly added:          ${added} (${toQueue.length - added} already pending)`)

  // ── Phase 4: Corpus analysis ──────────────────────────────────────────────
  console.log("\n═══ Phase 4: Combined Corpus Analysis ═══════════════════════")

  // Combine content + toQueue for "what would corpus look like after approval"
  const combined = [
    ...content,
    ...toQueue.map(i => i.extracted),
  ]

  // Star buckets
  const starBuckets  = { "20-99": 0, "100-499": 0, "500-1999": 0, "2000-9999": 0, "10000+": 0, "unknown": 0 }
  const tierBuckets  = { active: 0, maintenance: 0, dormant: 0 }
  const ownerCounts  = {}
  const topicCounts  = {}
  const ecoCounts    = {}
  const licenseCounts = {}
  const langCounts   = {}
  let gfiCount = 0
  let hwiCount = 0

  for (const r of combined) {
    const s = r.stars ?? r.stargazers_count ?? 0
    if      (s < 100)   starBuckets["20-99"]++
    else if (s < 500)   starBuckets["100-499"]++
    else if (s < 2000)  starBuckets["500-1999"]++
    else if (s < 10000) starBuckets["2000-9999"]++
    else if (s >= 10000) starBuckets["10000+"]++
    else                starBuckets["unknown"]++

    const tier = r.activityTier ?? "unknown"
    tierBuckets[tier] = (tierBuckets[tier] ?? 0) + 1

    const owner = r.owner ?? "unknown"
    ownerCounts[owner] = (ownerCounts[owner] ?? 0) + 1

    const eco = r.eco ?? "unknown"
    ecoCounts[eco] = (ecoCounts[eco] ?? 0) + 1

    const license = r.license ?? "unknown"
    licenseCounts[license] = (licenseCounts[license] ?? 0) + 1

    const lang = r.language ?? "unknown"
    langCounts[lang] = (langCounts[lang] ?? 0) + 1

    for (const t of (r.topics ?? [])) {
      topicCounts[t] = (topicCounts[t] ?? 0) + 1
    }

    if ((r.goodFirstIssuesCount ?? 0) > 0) gfiCount++
    if ((r.helpWantedIssuesCount ?? 0) > 0) hwiCount++
  }

  const N = combined.length
  console.log(`\n  Total (published + queued): ${N}`)
  console.log(`    Published in content.json: ${content.length}`)
  console.log(`    Pending (would be approved): ${toQueue.length}`)

  console.log("\n  ── Star distribution ─────────────────────────────────────")
  Object.entries(starBuckets).forEach(([k, v]) => {
    if (v > 0) console.log(`    ${k.padEnd(10)}: ${v.toString().padStart(4)} (${(v/N*100).toFixed(1)}%)`)
  })

  console.log("\n  ── Activity distribution ─────────────────────────────────")
  Object.entries(tierBuckets).sort((a,b)=>b[1]-a[1]).forEach(([k, v]) => {
    if (v > 0) console.log(`    ${k.padEnd(12)}: ${v.toString().padStart(4)} (${(v/N*100).toFixed(1)}%)`)
  })

  console.log("\n  ── Owner distribution (top 20) ───────────────────────────")
  Object.entries(ownerCounts).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([o,n])=>{
    console.log(`    ${o.padEnd(25)}: ${n}`)
  })

  console.log("\n  ── Ecosystem category distribution ───────────────────────")
  Object.entries(ecoCounts).sort((a,b)=>b[1]-a[1]).forEach(([e,n])=>{
    const bar = "█".repeat(Math.max(1, Math.round(n/N*40)))
    console.log(`    ${e.padEnd(22)}: ${n.toString().padStart(4)} ${bar}`)
  })

  console.log("\n  ── Language distribution ─────────────────────────────────")
  Object.entries(langCounts).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([l,n])=>{
    console.log(`    ${l.padEnd(20)}: ${n}`)
  })

  console.log("\n  ── License distribution ──────────────────────────────────")
  Object.entries(licenseCounts).sort((a,b)=>b[1]-a[1]).forEach(([l,n])=>{
    console.log(`    ${l.padEnd(20)}: ${n}`)
  })

  console.log("\n  ── Top topics (>10 repos) ────────────────────────────────")
  Object.entries(topicCounts).filter(([,n])=>n>10).sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(([t,n])=>{
    console.log(`    ${t.padEnd(25)}: ${n}`)
  })

  console.log("\n  ── Issue signals ─────────────────────────────────────────")
  console.log(`    Has good-first-issues > 0 : ${gfiCount} (${(gfiCount/N*100).toFixed(1)}%)`)
  console.log(`    Has help-wanted > 0       : ${hwiCount} (${(hwiCount/N*100).toFixed(1)}%)`)

  // ── Phase 5: Dependency-indexing readiness ─────────────────────────────────
  console.log("\n═══ Phase 5: Dependency-Indexing Readiness ══════════════════")

  // Estimate workspace likelihood from indicators:
  // - name suggests multiple crates: monorepo patterns
  // - large orgs (tokio-rs, rust-lang, hyperium) typically use workspaces
  // - repos with "workspace" in name/description likely ARE workspaces
  const workspaceKeywords = ["workspace", "monorepo", "crates", "multi-crate"]
  let likelyWorkspaces = 0
  let likelySingleCrate = 0
  for (const r of combined) {
    const desc = (r.note ?? r.description ?? "").toLowerCase()
    const topics = (r.topics ?? []).join(" ").toLowerCase()
    const name = (r.name ?? "").toLowerCase()
    if (workspaceKeywords.some(k => desc.includes(k) || name.includes(k) || topics.includes(k))) {
      likelyWorkspaces++
    } else {
      likelySingleCrate++
    }
  }

  // Every Rust repo has Cargo.toml — that's the definition of a Rust project.
  // Rust language detection from GitHub = Cargo.toml present.
  const cargoTomls = N  // 100% of Rust repos
  // But workspace Cargo.tomls have member subcrate Cargo.tomls too
  const estimatedWorkspaceCrates = likelyWorkspaces * 4  // avg 4 crates per workspace
  const totalCargoFiles = likelySingleCrate + estimatedWorkspaceCrates

  console.log(`\n  Repos with Cargo.toml: ${cargoTomls} (100% — required for GitHub to detect Rust)`)
  console.log(`  Likely workspace repos: ~${likelyWorkspaces} (based on description/name keywords)`)
  console.log(`  Likely single-crate:    ~${likelySingleCrate}`)
  console.log(`  Est. total Cargo.toml files (incl. workspace members): ~${totalCargoFiles}`)

  // API cost estimate
  // GitHub Contents API: 1 call per repo for /Cargo.toml or /Cargo.lock
  // For workspaces: 1 additional call per member crate
  const contentsApiCalls = N + estimatedWorkspaceCrates
  const minutesAtRateLimit = Math.ceil(contentsApiCalls / (5000 / 60))  // 5000/hour with token
  console.log(`\n  GitHub Contents API calls needed:`)
  console.log(`    Root Cargo.toml fetch:     ${N} calls (1 per repo)`)
  console.log(`    Workspace member discovery: ~${estimatedWorkspaceCrates} additional calls`)
  console.log(`    Total:                     ~${contentsApiCalls} calls`)
  console.log(`    Time at 5000 req/h (with token): ~${minutesAtRateLimit} minutes`)
  console.log(`    Time without token (60 req/h):   ~${Math.ceil(contentsApiCalls / 1)} requests — not feasible`)

  // ── Summary & Recommendation ──────────────────────────────────────────────
  const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
  console.log("\n═══ Summary ══════════════════════════════════════════════════")
  console.log(`  Scan completed in: ${elapsedSec}s`)
  console.log(`  Raw repos fetched:   ${rawRepos.length}`)
  console.log(`  Already in corpus:   ${dupCount}`)
  console.log(`  Quality rejected:    ${junkCount}`)
  console.log(`  Newly queued:        ${added}`)
  console.log(`  Combined corpus (published + pending): ${N}`)
  console.log(`  DRY_RUN: ${DRY_RUN ? "YES — no files written" : "NO — data/pending/oss.json updated"}`)

  console.log("\n═══ Recommendation ═══════════════════════════════════════════")
  const totalProjected = content.length + added
  if (totalProjected >= 800) {
    console.log(`  → PROCEED to Cargo.toml dependency indexing.`)
    console.log(`    Combined corpus (${totalProjected} repos) is large enough for dependency search to be useful.`)
    console.log(`    Indexing ~${contentsApiCalls} Cargo.toml files at 5000 req/h = ~${minutesAtRateLimit}min.`)
  } else {
    console.log(`  → CONTINUE repository discovery.`)
    console.log(`    Combined corpus (${totalProjected} repos) is below the 800-repo threshold for useful dependency search.`)
    console.log(`    Run another scan after approving current pending batch, then reassess.`)
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1) })
