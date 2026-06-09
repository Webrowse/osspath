/**
 * OSS dependency indexer — fetches Cargo.toml for every repo in content/oss.json,
 * parses [dependencies], [dev-dependencies], [build-dependencies], handles Rust workspaces,
 * and writes a `dependencies: string[]` field back to each record.
 *
 * Usage:
 *   node scripts/enrich-oss-deps.mjs              # full run
 *   DRY_RUN=1 node scripts/enrich-oss-deps.mjs    # report only, no writes
 *   MAX_REPOS=50 node scripts/enrich-oss-deps.mjs  # process first 50 only (testing)
 *
 * Caching: data/oss-deps-cache.json stores { [owner/repo]: { pushedAt, deps, fetchedAt } }
 * Re-runs only refetch repos whose pushedAt has changed since last run.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const DRY_RUN = process.env.DRY_RUN === "1"
const MAX_REPOS = parseInt(process.env.MAX_REPOS ?? "0", 10) || 0
const TODAY = new Date().toISOString().slice(0, 10)
const WORKSPACE_MEMBER_CAP = 15

// Load .env.local
try {
  const env = readFileSync(join(ROOT, ".env.local"), "utf-8")
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
  }
} catch { /* no .env.local */ }

const TOKEN = process.env.GITHUB_TOKEN
if (!TOKEN) {
  console.error("❌ GITHUB_TOKEN not set. Aborting (unauthenticated limit is 60 req/h, far too low).")
  process.exit(1)
}

const GH_HEADERS = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "jobs.adarshrust.com/oss-deps",
  Authorization: `Bearer ${TOKEN}`,
}

console.log(`✓ GITHUB_TOKEN (${TOKEN.slice(0, 8)}…)`)
if (DRY_RUN) console.log("DRY RUN — no files will be written\n")
if (MAX_REPOS > 0) console.log(`MAX_REPOS=${MAX_REPOS} (testing mode)\n`)

// ── File paths ────────────────────────────────────────────────────────────────

const CONTENT_FILE = join(ROOT, "content", "oss.json")
const PENDING_FILE = join(ROOT, "data", "pending", "oss.json")
const CACHE_FILE   = join(ROOT, "data", "oss-deps-cache.json")
const STATS_FILE   = join(ROOT, "content", "oss-deps-stats.json")

// ── File helpers ──────────────────────────────────────────────────────────────

function readJSON(p) {
  if (!existsSync(p)) return []
  try { return JSON.parse(readFileSync(p, "utf-8").trim() || "[]") } catch { return [] }
}

function readJSONObj(p) {
  if (!existsSync(p)) return {}
  try { return JSON.parse(readFileSync(p, "utf-8").trim() || "{}") } catch { return {} }
}

function writeJSON(p, data) {
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf-8")
}

// ── Rate limiter ──────────────────────────────────────────────────────────────
// 70 calls/min = 4200/h — comfortable margin under the 5000/h authenticated limit.

const MIN_INTERVAL_MS = 860
let _lastCallAt = 0

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function rateWait() {
  const now = Date.now()
  const since = now - _lastCallAt
  if (since < MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS - since)
  _lastCallAt = Date.now()
}

// ── GitHub API ────────────────────────────────────────────────────────────────

async function ghContents(owner, repo, filePath) {
  await rateWait()
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`
  try {
    const res = await fetch(url, { headers: GH_HEADERS, signal: AbortSignal.timeout(20_000) })
    if (res.status === 404) return null
    if (res.status === 403) {
      const reset = res.headers.get("x-ratelimit-reset")
      const wait = reset ? Math.max(0, Number(reset) * 1000 - Date.now()) + 2000 : 60_000
      console.warn(`  ⚠ Rate limit hit — waiting ${Math.ceil(wait / 1000)}s`)
      await sleep(wait)
      return ghContents(owner, repo, filePath)  // one retry
    }
    if (!res.ok) return null
    const data = await res.json()
    if (Array.isArray(data) || data.type !== "file" || !data.content) return null
    return Buffer.from(data.content, "base64").toString("utf-8")
  } catch {
    return null
  }
}

async function ghListDir(owner, repo, dirPath) {
  await rateWait()
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}`
  try {
    const res = await fetch(url, { headers: GH_HEADERS, signal: AbortSignal.timeout(20_000) })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

// ── TOML parser (Cargo.toml subset) ──────────────────────────────────────────
//
// Handles:
//   [dependencies], [dev-dependencies], [build-dependencies]
//   [workspace.dependencies]
//   [target.'cfg(...)'.dependencies] and target dev/build variants
//   [dependencies.serde] dotted-table form
//   tokio.workspace = true  (workspace inheritance, key still captured as "tokio")
//   Multiline workspace.members = [ ... ]
//   Glob members: "crates/*"

const META_KEYS = new Set([
  "version", "features", "optional", "workspace", "git", "path",
  "registry", "default-features", "package", "branch", "tag", "rev",
  "artifact", "lib", "target", "name", "edition", "authors",
  "description", "homepage", "repository", "license", "keywords",
  "categories", "build", "resolver", "default", "members",
  "exclude", "include", "readme", "publish", "autolib", "autobins",
  "autotests", "autoexamples", "autobinaries",
])

function isDepsSection(section) {
  if (!section) return false
  // Strip target prefix: target.'cfg(windows)'.  or  target."cfg(...)".
  const s = section.replace(/^target\.['"]?[^.]+['"]?\./, "")
  return (
    s === "dependencies" ||
    s === "dev-dependencies" ||
    s === "build-dependencies" ||
    s === "workspace.dependencies"
  )
}

function parseMembersList(str, out) {
  const items = str
    .split(",")
    .map(s => s.trim().replace(/^["']|["']$/g, "").trim())
    .filter(Boolean)
  out.push(...items)
}

function parseCargoToml(content) {
  const deps = new Set()
  const members = []
  let section = null
  let inMembersArr = false
  let membersBuf = ""

  for (const raw of content.split("\n")) {
    // Strip inline comment (find first unquoted #)
    let line = ""
    let inStr = false
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i]
      if (c === '"' && raw[i - 1] !== "\\") inStr = !inStr
      if (!inStr && c === "#") break
      line += c
    }
    line = line.trim()
    if (!line) continue

    // Collect multiline members array
    if (inMembersArr) {
      const ci = line.indexOf("]")
      if (ci >= 0) {
        membersBuf += line.slice(0, ci)
        parseMembersList(membersBuf, members)
        inMembersArr = false
        membersBuf = ""
      } else {
        membersBuf += line + ","
      }
      continue
    }

    // Section header  [table]  or  [[array-of-tables]]
    if (line.startsWith("[")) {
      const inner = line.replace(/^\[+/, "").replace(/\]+$/, "").trim()

      // [dependencies.serde]  [dev-dependencies.tokio]  [target.'cfg(...)'.dependencies.foo]
      const dottedDep = inner.match(
        /^(?:target\.['"]?[^.]+['"]?\.)?((?:workspace\.)?(?:dev-|build-)?dependencies)\.(.+)/
      )
      if (dottedDep) {
        const depName = dottedDep[2].replace(/['"`]/g, "").trim()
        if (depName && !META_KEYS.has(depName)) deps.add(depName)
        section = null
        continue
      }

      section = inner
      continue
    }

    // workspace.members
    if (section === "workspace" && line.startsWith("members")) {
      const oi = line.indexOf("[")
      const ci = line.lastIndexOf("]")
      if (oi >= 0) {
        if (ci > oi) {
          parseMembersList(line.slice(oi + 1, ci), members)
        } else {
          inMembersArr = true
          membersBuf = line.slice(oi + 1)
        }
      }
      continue
    }

    // Dependency entries:  name = ...  OR  name.subkey = ...  OR  name.workspace = true
    if (isDepsSection(section)) {
      const m = line.match(/^([\w-]+)[\s=.]/)
      if (m && !META_KEYS.has(m[1])) {
        deps.add(m[1])
      }
    }
  }

  return { deps: [...deps], members }
}

// ── Workspace resolution ──────────────────────────────────────────────────────

function parseHref(href) {
  const m = href.match(/github\.com\/([^/]+)\/([^/]+)/)
  return m ? { owner: m[1], repo: m[2] } : null
}

async function resolveWorkspaceMembers(owner, repo, patterns) {
  const paths = []
  for (const pattern of patterns) {
    if (pattern.includes("*")) {
      // e.g. "crates/*" — list the parent directory
      const dirPath = pattern.replace(/\/?\*.*$/, "")
      if (!dirPath) continue
      const entries = await ghListDir(owner, repo, dirPath)
      for (const e of entries) {
        if (e.type === "dir") paths.push(e.path)
      }
    } else {
      paths.push(pattern)
    }
  }
  return paths.slice(0, WORKSPACE_MEMBER_CAP)
}

// ── Per-repo enrichment ───────────────────────────────────────────────────────

async function enrichRepo(owner, repo, pushedAt, cache) {
  const key = `${owner}/${repo}`
  const hit = cache[key]

  if (hit && hit.pushedAt === pushedAt) {
    return { deps: hit.deps, fromCache: true, workspaceMembers: 0, cargoFiles: 0 }
  }

  let cargoFiles = 0
  const rootContent = await ghContents(owner, repo, "Cargo.toml")
  cargoFiles++

  if (!rootContent) {
    cache[key] = { pushedAt, deps: [], fetchedAt: TODAY }
    return { deps: [], fromCache: false, workspaceMembers: 0, cargoFiles }
  }

  const { deps: rootDeps, members } = parseCargoToml(rootContent)

  if (members.length === 0) {
    const deps = [...new Set(rootDeps)]
    cache[key] = { pushedAt, deps, fetchedAt: TODAY }
    return { deps, fromCache: false, workspaceMembers: 0, cargoFiles }
  }

  // Workspace — expand members and aggregate deps
  const resolvedPaths = await resolveWorkspaceMembers(owner, repo, members)
  const allDeps = new Set(rootDeps)

  for (const memberPath of resolvedPaths) {
    const mc = await ghContents(owner, repo, `${memberPath}/Cargo.toml`)
    cargoFiles++
    if (mc) {
      const { deps: md } = parseCargoToml(mc)
      for (const d of md) allDeps.add(d)
    }
  }

  const deps = [...allDeps]
  cache[key] = { pushedAt, deps, fetchedAt: TODAY }
  return { deps, fromCache: false, workspaceMembers: resolvedPaths.length, cargoFiles }
}

// ── Promote pending → content ─────────────────────────────────────────────────

function promoteAllPending() {
  const pending = readJSON(PENDING_FILE)
  if (pending.length === 0) {
    console.log("No pending items to promote.")
    return []
  }
  // Deduplicate by href
  const seen = new Set()
  const promoted = []
  for (const item of pending) {
    const ext = item.extracted ?? {}
    const href = ext.href
    if (!href || seen.has(href)) continue
    seen.add(href)
    promoted.push({ ...ext, checkedAt: ext.checkedAt ?? TODAY })
  }
  console.log(`Promoted ${promoted.length} items from pending to content (${pending.length - promoted.length} dupes dropped)`)
  return promoted
}

// ── Statistics ────────────────────────────────────────────────────────────────

function computeStats(repos) {
  const freq = {}
  let withDeps = 0
  for (const r of repos) {
    const deps = r.dependencies ?? []
    if (deps.length > 0) withDeps++
    for (const d of deps) freq[d] = (freq[d] ?? 0) + 1
  }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
  return { withDeps, uniqueDeps: sorted.length, top100: sorted.slice(0, 100) }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══ OSS Dependency Indexer ═══\n")

  // Step 0: Ensure content/oss.json is populated
  let content = readJSON(CONTENT_FILE)
  if (content.length === 0) {
    console.log("content/oss.json is empty — promoting from pending…")
    content = promoteAllPending()
    if (!DRY_RUN) writeJSON(CONTENT_FILE, content)
    console.log(`content/oss.json: ${content.length} repos\n`)
  } else {
    console.log(`content/oss.json: ${content.length} repos (already populated)\n`)
  }

  const repos = MAX_REPOS > 0 ? content.slice(0, MAX_REPOS) : content
  if (MAX_REPOS > 0) console.log(`Processing first ${repos.length} repos only\n`)

  // Step 1: Load cache
  const cache = readJSONObj(CACHE_FILE)
  const initialCacheSize = Object.keys(cache).length
  console.log(`Cache: ${initialCacheSize} entries\n`)

  // Step 2: Enrich
  console.log(`Enriching ${repos.length} repos (rate: ~70 API calls/min)…`)
  const startTime = Date.now()

  let fromCache = 0, freshFetched = 0, workspaceCount = 0
  let totalCargoFiles = 0, noCargoToml = 0

  for (let i = 0; i < repos.length; i++) {
    const r = repos[i]
    const parsed = parseHref(r.href)
    if (!parsed) {
      console.log(`  [${i + 1}/${repos.length}] skip — unparseable href: ${r.href}`)
      continue
    }
    const { owner, repo } = parsed
    const pushedAt = r.pushedAt ?? ""

    process.stdout.write(`  [${String(i + 1).padStart(4)}/${repos.length}] ${owner}/${repo} … `)

    const result = await enrichRepo(owner, repo, pushedAt, cache)

    if (result.fromCache) {
      fromCache++
      process.stdout.write(`cached (${result.deps.length} deps)\n`)
    } else {
      freshFetched++
      totalCargoFiles += result.cargoFiles
      if (result.deps.length === 0) noCargoToml++
      if (result.workspaceMembers > 0) workspaceCount++
      process.stdout.write(
        `${result.deps.length} deps` +
        (result.workspaceMembers > 0 ? ` (workspace: ${result.workspaceMembers} members)` : "") +
        "\n"
      )
    }

    // Write deps back to the repo record
    r.dependencies = result.deps

    // Periodic cache save every 50 repos
    if ((i + 1) % 50 === 0 && !DRY_RUN) {
      writeJSON(CACHE_FILE, cache)
    }
  }

  // Step 3: Write back
  if (!DRY_RUN) {
    writeJSON(CONTENT_FILE, content)
    writeJSON(CACHE_FILE, cache)
    console.log("\n✓ content/oss.json written")
    console.log("✓ data/oss-deps-cache.json written")
  }

  // Step 4: Statistics
  const stats = computeStats(repos)
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)

  console.log("\n════════════════════════════")
  console.log("  DEPENDENCY INDEX REPORT")
  console.log("════════════════════════════\n")
  console.log(`Repos processed:    ${repos.length}`)
  console.log(`From cache:         ${fromCache}`)
  console.log(`Freshly indexed:    ${freshFetched}`)
  console.log(`  Cargo.toml files: ${totalCargoFiles}`)
  console.log(`  No Cargo.toml:    ${noCargoToml}`)
  console.log(`  Workspace repos:  ${workspaceCount}`)
  console.log(`\nRepos with deps:    ${stats.withDeps} / ${repos.length} (${(stats.withDeps / repos.length * 100).toFixed(1)}%)`)
  console.log(`Unique crates:      ${stats.uniqueDeps}`)
  console.log(`Time elapsed:       ${elapsed}s`)
  console.log("\nTop 50 dependencies:")
  for (const [dep, count] of stats.top100.slice(0, 50)) {
    const bar = "█".repeat(Math.round(count / stats.top100[0][1] * 20))
    console.log(`  ${dep.padEnd(30)} ${String(count).padStart(5)}  ${bar}`)
  }

  // Write stats file
  const statsData = {
    generatedAt: new Date().toISOString(),
    totalRepos: repos.length,
    reposWithDeps: stats.withDeps,
    uniqueDeps: stats.uniqueDeps,
    top100: stats.top100.map(([crate, count]) => ({ crate, count })),
  }
  if (!DRY_RUN) {
    writeJSON(STATS_FILE, statsData)
    console.log("\n✓ content/oss-deps-stats.json written")
  }

  console.log("\nDone.")
}

main().catch(err => { console.error(err); process.exit(1) })
