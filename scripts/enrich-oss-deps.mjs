/**
 * OSS dependency indexer — fetches Cargo.toml for every repo in content/oss.json,
 * parses [dependencies], [dev-dependencies], [build-dependencies], handles Rust workspaces,
 * and writes a `dependencies: string[]` field back to each record.
 *
 * Usage:
 *   node scripts/enrich-oss-deps.mjs                          # full run
 *   DRY_RUN=1 node scripts/enrich-oss-deps.mjs                # report only, no writes
 *   MAX_REPOS=50 node scripts/enrich-oss-deps.mjs             # process first 50 only
 *   REPOS=facebook/relay,openai/codex node scripts/enrich-oss-deps.mjs  # targeted repos
 *   FORCE_REFRESH=1 REPOS=... node scripts/enrich-oss-deps.mjs          # bust cache + retarget
 *
 * Caching: data/oss-deps-cache.json stores { [owner/repo]: { pushedAt, deps, fetchedAt } }
 * Re-runs only refetch repos whose pushedAt has changed since last run, unless FORCE_REFRESH=1.
 *
 * Workspace-aware discovery:
 *   When no Cargo.toml is found at repo root, a BFS search up to depth SEARCH_MAX_DEPTH
 *   locates all Cargo.toml files within SEARCH_MAX_DIRS directory inspections. Workspace
 *   members are resolved relative to each discovered manifest's directory.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const DRY_RUN       = process.env.DRY_RUN       === "1"
const FORCE_REFRESH = process.env.FORCE_REFRESH  === "1"
const MAX_REPOS     = parseInt(process.env.MAX_REPOS ?? "0", 10) || 0
const REPOS         = process.env.REPOS
  ? process.env.REPOS.split(",").map(r => r.trim()).filter(Boolean)
  : []
const TODAY = new Date().toISOString().slice(0, 10)

// Workspace extraction limits
const WORKSPACE_MEMBER_CAP = 50  // max member crates to read per workspace
const SEARCH_MAX_DEPTH     = 4   // max directory depth for Cargo.toml BFS
const SEARCH_MAX_DIRS      = 40  // max directories to inspect per repo during BFS
const SEARCH_MAX_TOMLS     = 5   // max Cargo.toml files to collect per repo

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
  "User-Agent": "osspath.com/oss-deps",
  Authorization: `Bearer ${TOKEN}`,
}

console.log(`✓ GITHUB_TOKEN (${TOKEN.slice(0, 8)}…)`)
if (DRY_RUN)        console.log("DRY RUN — no files will be written")
if (FORCE_REFRESH)  console.log("FORCE_REFRESH — ignoring dep cache for targeted repos")
if (MAX_REPOS > 0)  console.log(`MAX_REPOS=${MAX_REPOS} (testing mode)`)
if (REPOS.length)   console.log(`REPOS filter: ${REPOS.join(", ")}`)
console.log()

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
//   workspace.members = [ ... ] dotted-key form (no [workspace] header)
//   Glob members: "crates/*"
//   package = "real-name" rename normalization (records real crate name)
//
// Path-dep filtering:
//   Inline deps: `name = { path = "..." }` with no version or git → skipped.
//   Table-header form: `[dependencies.name]` followed by `path = ...` → staged
//   and retracted before committing (pendingDep state machine).

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
  // Fix D: stage table-header deps ([dependencies.name]) and buffer their body
  // lines until the next section header. Only then can we determine path-only
  // status — `path =` and `version =` may appear on separate lines.
  let pendingDep = null      // staged dep name
  let pendingHasPath = false // saw `path =` in the body
  let pendingHasVer  = false // saw `version =` in the body
  let pendingHasGit  = false // saw `git =` in the body

  function flushPending() {
    if (pendingDep === null) return
    const isPathOnly = pendingHasPath && !pendingHasVer && !pendingHasGit
    if (!isPathOnly) deps.add(pendingDep)
    pendingDep = null; pendingHasPath = false; pendingHasVer = false; pendingHasGit = false
  }

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

    // Fix D: accumulate body lines for a staged [dependencies.name] dep.
    // Flush (commit or retract) when the next section header appears.
    if (pendingDep !== null && !line.startsWith("[")) {
      if (/\bpath\s*=/.test(line))    pendingHasPath = true
      if (/\bversion\s*=/.test(line)) pendingHasVer  = true
      if (/\bgit\s*=/.test(line))     pendingHasGit  = true
      continue  // body lines belong to the pending dep, not to any section
    }

    // Section header  [table]  or  [[array-of-tables]]
    if (line.startsWith("[")) {
      flushPending()  // resolve any staged dep before changing section

      const inner = line.replace(/^\[+/, "").replace(/\]+$/, "").trim()

      // [dependencies.serde]  [dev-dependencies.tokio]  [target.'cfg(...)'.dependencies.foo]
      const dottedDep = inner.match(
        /^(?:target\.['"]?[^.]+['"]?\.)?((?:workspace\.)?(?:dev-|build-)?dependencies)\.(.+)/
      )
      if (dottedDep) {
        const depName = dottedDep[2].replace(/['"`]/g, "").trim()
        // Stage rather than commit; body lines will reveal path/version/git.
        if (depName && !META_KEYS.has(depName)) pendingDep = depName
        section = null
        continue
      }

      section = inner
      continue
    }

    // Fix A: dotted-key workspace.members (no [workspace] section header).
    // Equivalent to the [workspace] section handler below, but fires when
    // section is null because the file omits the [workspace] header entirely.
    if (!section && /^workspace\.members\s*=/.test(line)) {
      const oi = line.indexOf("[")
      const ci = line.lastIndexOf("]")
      if (oi >= 0) {
        if (ci > oi) parseMembersList(line.slice(oi + 1, ci), members)
        else { inMembersArr = true; membersBuf = line.slice(oi + 1) }
      }
      continue
    }

    // workspace.members inside [workspace] section
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
        // Skip pure path deps: `name = { path = "..." }` with no version or git specifier.
        const isPathOnlyDep = /\bpath\s*=/.test(line)
          && !/\bversion\s*=/.test(line)
          && !/\bgit\s*=/.test(line)
        if (!isPathOnlyDep) {
          // Fix C: resolve package = "real-name" rename; record the published crate name.
          const pkgMatch = line.match(/\bpackage\s*=\s*["']([^"']+)["']/)
          deps.add(pkgMatch ? pkgMatch[1] : m[1])
        }
      }
    }
  }

  flushPending()  // Fix D: commit or retract any dep staged at end of file

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
      // e.g. "crates/*" or "compiler/crates/*" — list the parent directory
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

// ── Workspace-aware Cargo.toml discovery ─────────────────────────────────────
//
// When there is no Cargo.toml at repo root, this BFS searches subdirectories
// up to SEARCH_MAX_DEPTH levels deep, inspecting at most SEARCH_MAX_DIRS
// directories and returning at most SEARCH_MAX_TOMLS manifest paths.
//
// Priority ordering: directories whose names contain Rust signals (rust/, crates/,
// *-rs, compiler/, cli/, etc.) are enqueued before other directories at the same
// depth, reducing API calls for repos with obvious layout conventions.
//
// Once a Cargo.toml is found in a directory, that directory's subdirectories are
// NOT enqueued — workspace members within it are resolved separately by
// resolveWorkspaceMembers(), preserving the correct base-path context.

const RUST_DIR_SIGNALS = [
  /^rust(-|_|$)/i,           // rust/, rust-core, rust_port
  /(-|_)rs$/i,               // codex-rs, relay-rs
  /^crates?$/i,              // crates/, crate/
  /^compiler$/i,
  /^src-tauri$/i,            // Tauri apps
  /^core$/i,
  /^cli$/i,
  /^server$/i,
  /^backend$/i,
  /^engine$/i,
  /^runtime$/i,
  /^daemon$/i,
  /^hypervisor$/i,
  /^vm$/i,
  /^native$/i,
]

function rustDirScore(name) {
  for (let i = 0; i < RUST_DIR_SIGNALS.length; i++) {
    if (RUST_DIR_SIGNALS[i].test(name)) return RUST_DIR_SIGNALS.length - i
  }
  return 0
}

async function findCargoTomlPaths(owner, repo) {
  const tomls = []
  // Queue entries: { path: string (empty = repo root), depth: number }
  const queue = [{ path: "", depth: 0 }]
  let dirsInspected = 0

  while (queue.length > 0 && tomls.length < SEARCH_MAX_TOMLS && dirsInspected < SEARCH_MAX_DIRS) {
    const { path, depth } = queue.shift()
    if (depth >= SEARCH_MAX_DEPTH) continue

    dirsInspected++
    const entries = await ghListDir(owner, repo, path)

    let foundHere = false
    const subdirs = []

    for (const e of entries) {
      if (e.type === "file" && e.name === "Cargo.toml") {
        foundHere = true
        // Normalize: root-level path is "" → store as "Cargo.toml"
        tomls.push(path ? `${path}/Cargo.toml` : "Cargo.toml")
        break  // one Cargo.toml per directory; siblings handled by workspace members
      }
      if (e.type === "dir" && depth + 1 < SEARCH_MAX_DEPTH) {
        subdirs.push(e)
      }
    }

    if (!foundHere) {
      // Enqueue subdirs sorted by Rust-signal strength (most likely first).
      // Ties preserve alphabetical order so traversal is deterministic.
      subdirs
        .sort((a, b) => rustDirScore(b.name) - rustDirScore(a.name) || a.name.localeCompare(b.name))
        .forEach(e => queue.push({ path: e.path, depth: depth + 1 }))
    }
    // If Cargo.toml was found here, do NOT recurse deeper — workspace member
    // resolution handles any nested crates via resolveWorkspaceMembers().
  }

  return tomls
}

// ── Per-repo enrichment ───────────────────────────────────────────────────────

async function enrichRepo(owner, repo, pushedAt, cache) {
  const key = `${owner}/${repo}`
  const hit = cache[key]

  // Cache hit: skip unless FORCE_REFRESH is set and this repo is in the REPOS list
  const skipCache = FORCE_REFRESH && (REPOS.length === 0 || REPOS.includes(key))
  if (hit && hit.pushedAt === pushedAt && !skipCache) {
    return { deps: hit.deps, fromCache: true, workspaceMembers: 0, cargoFiles: 0, discoveredPaths: [] }
  }

  let cargoFiles = 0
  let discoveredPaths = []

  // ── Phase 1: Try root Cargo.toml (fast path for the majority of repos) ──────
  const rootContent = await ghContents(owner, repo, "Cargo.toml")
  cargoFiles++

  if (rootContent) {
    discoveredPaths = ["Cargo.toml"]
  } else {
    // ── Phase 2: BFS search for Cargo.toml in subdirectories ─────────────────
    discoveredPaths = await findCargoTomlPaths(owner, repo)
    // ghListDir calls are not reflected in cargoFiles (it tracks ghContents only);
    // approximate by counting discovered paths as additional reads.
    cargoFiles += discoveredPaths.length
  }

  if (discoveredPaths.length === 0) {
    cache[key] = { pushedAt, deps: [], fetchedAt: TODAY }
    return { deps: [], fromCache: false, workspaceMembers: 0, cargoFiles, discoveredPaths: [] }
  }

  // ── Phase 3: Parse each discovered Cargo.toml, resolve workspace members ────
  const allDeps = new Set()
  let totalWorkspaceMembers = 0

  for (const tomlPath of discoveredPaths) {
    // Reuse the already-fetched root content to save one API call
    const content = (tomlPath === "Cargo.toml" && rootContent)
      ? rootContent
      : await ghContents(owner, repo, tomlPath)

    cargoFiles++
    if (!content) continue

    const { deps: parsedDeps, members } = parseCargoToml(content)
    for (const d of parsedDeps) allDeps.add(d)

    if (members.length === 0) continue

    // Resolve member paths relative to this Cargo.toml's directory.
    // e.g. if tomlPath = "compiler/Cargo.toml" and member = "crates/relay-transforms",
    // the absolute path becomes "compiler/crates/relay-transforms".
    const baseDir = tomlPath.includes("/")
      ? tomlPath.slice(0, tomlPath.lastIndexOf("/"))
      : ""
    const absoluteMembers = members.map(m => (baseDir ? `${baseDir}/${m}` : m))

    const resolvedPaths = await resolveWorkspaceMembers(owner, repo, absoluteMembers)
    totalWorkspaceMembers += resolvedPaths.length

    for (const memberPath of resolvedPaths) {
      const mc = await ghContents(owner, repo, `${memberPath}/Cargo.toml`)
      cargoFiles++
      if (mc) {
        const { deps: md } = parseCargoToml(mc)
        for (const d of md) allDeps.add(d)
      }
    }
  }

  const deps = [...allDeps]
  cache[key] = { pushedAt, deps, fetchedAt: TODAY }
  return { deps, fromCache: false, workspaceMembers: totalWorkspaceMembers, cargoFiles, discoveredPaths }
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

  // Determine which repos to process
  let repos
  if (REPOS.length > 0) {
    repos = content.filter(r => {
      const p = parseHref(r.href)
      return p && REPOS.includes(`${p.owner}/${p.repo}`)
    })
    console.log(`REPOS filter matched ${repos.length} / ${content.length} repos\n`)
  } else if (MAX_REPOS > 0) {
    repos = content.slice(0, MAX_REPOS)
    console.log(`Processing first ${repos.length} repos only\n`)
  } else {
    repos = content
  }

  // Step 1: Load cache
  const cache = readJSONObj(CACHE_FILE)
  const initialCacheSize = Object.keys(cache).length
  console.log(`Cache: ${initialCacheSize} entries\n`)

  // Step 2: Enrich
  console.log(`Enriching ${repos.length} repos (rate: ~70 API calls/min)…`)
  const startTime = Date.now()

  let fromCache = 0, freshFetched = 0, workspaceCount = 0
  let totalCargoFiles = 0, noCargoToml = 0, subdirDiscoveries = 0

  // Track repos that gained deps through workspace discovery (for the report)
  const discoveryReport = []  // { key, tomlPaths, depsBefore, depsAfter, newDeps }

  for (let i = 0; i < repos.length; i++) {
    const r = repos[i]
    const parsed = parseHref(r.href)
    if (!parsed) {
      console.log(`  [${i + 1}/${repos.length}] skip — unparseable href: ${r.href}`)
      continue
    }
    const { owner, repo } = parsed
    const pushedAt = r.pushedAt ?? ""
    const key = `${owner}/${repo}`

    process.stdout.write(`  [${String(i + 1).padStart(4)}/${repos.length}] ${key} … `)

    const depsBefore = r.dependencies?.length ?? 0
    const result = await enrichRepo(owner, repo, pushedAt, cache)

    if (result.fromCache) {
      fromCache++
      process.stdout.write(`cached (${result.deps.length} deps)\n`)
    } else {
      freshFetched++
      totalCargoFiles += result.cargoFiles
      if (result.deps.length === 0) noCargoToml++
      if (result.workspaceMembers > 0) workspaceCount++

      const isSubdirDiscovery = result.discoveredPaths.length > 0
        && !result.discoveredPaths.every(p => p === "Cargo.toml")
      if (isSubdirDiscovery) subdirDiscoveries++

      const tomlSummary = result.discoveredPaths.length > 0
        ? ` [${result.discoveredPaths.join(", ")}]`
        : ""
      process.stdout.write(
        `${result.deps.length} deps` +
        (result.workspaceMembers > 0 ? ` (workspace: ${result.workspaceMembers} members)` : "") +
        tomlSummary + "\n"
      )

      // Record workspace discovery results for the final report
      if (isSubdirDiscovery && result.deps.length > depsBefore) {
        const newDeps = result.deps.filter(d => !(r.dependencies ?? []).includes(d))
        discoveryReport.push({
          key,
          tomlPaths: result.discoveredPaths,
          depsBefore,
          depsAfter: result.deps.length,
          newDeps: newDeps.slice(0, 20),  // cap for display
        })
      }
    }

    // Write deps back to the repo record in content/oss.json
    r.dependencies = result.deps

    // Periodic cache save every 50 repos
    if ((i + 1) % 50 === 0 && !DRY_RUN) {
      writeJSON(CACHE_FILE, cache)
    }
  }

  // Step 3: Write back
  if (!DRY_RUN) {
    // When running with REPOS filter, merge updated records back into the full content array
    if (REPOS.length > 0) {
      const fullContent = readJSON(CONTENT_FILE)
      const updatedByHref = new Map(repos.map(r => [r.href, r]))
      const merged = fullContent.map(r => updatedByHref.get(r.href) ?? r)
      writeJSON(CONTENT_FILE, merged)
    } else {
      writeJSON(CONTENT_FILE, content)
    }
    writeJSON(CACHE_FILE, cache)
    console.log("\n✓ content/oss.json written")
    console.log("✓ data/oss-deps-cache.json written")
  }

  // Step 4: Statistics
  const statsSource = REPOS.length > 0 ? readJSON(CONTENT_FILE) : content
  const stats = computeStats(statsSource)
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)

  console.log("\n════════════════════════════════════")
  console.log("  DEPENDENCY INDEX REPORT")
  console.log("════════════════════════════════════\n")
  console.log(`Repos processed:         ${repos.length}`)
  console.log(`From cache:              ${fromCache}`)
  console.log(`Freshly indexed:         ${freshFetched}`)
  console.log(`  Cargo.toml files read: ${totalCargoFiles}`)
  console.log(`  No Cargo.toml found:   ${noCargoToml}`)
  console.log(`  Workspace repos:       ${workspaceCount}`)
  console.log(`  Subdir discoveries:    ${subdirDiscoveries}`)
  console.log(`\nRepos with deps:         ${stats.withDeps} / ${statsSource.length} (${(stats.withDeps / statsSource.length * 100).toFixed(1)}%)`)
  console.log(`Unique crates:           ${stats.uniqueDeps}`)
  console.log(`Time elapsed:            ${elapsed}s`)

  // Step 5: Workspace discovery report
  if (discoveryReport.length > 0) {
    console.log("\n════════════════════════════════════")
    console.log("  WORKSPACE DISCOVERY REPORT")
    console.log("════════════════════════════════════")
    console.log(`  ${discoveryReport.length} repo(s) recovered via subdirectory Cargo.toml search\n`)

    for (const entry of discoveryReport) {
      console.log(`  ┌─ ${entry.key}`)
      console.log(`  │  Cargo.toml: ${entry.tomlPaths.join(", ")}`)
      console.log(`  │  Deps: ${entry.depsBefore} → ${entry.depsAfter} (+${entry.depsAfter - entry.depsBefore})`)
      if (entry.newDeps.length > 0) {
        const preview = entry.newDeps.slice(0, 10).join(", ")
        const more = entry.newDeps.length > 10 ? ` … +${entry.newDeps.length - 10} more` : ""
        console.log(`  │  New: ${preview}${more}`)
      }
      console.log(`  └${"─".repeat(60)}`)
    }
  }

  console.log("\nTop 50 dependencies:")
  for (const [dep, count] of stats.top100.slice(0, 50)) {
    const bar = "█".repeat(Math.round(count / stats.top100[0][1] * 20))
    console.log(`  ${dep.padEnd(30)} ${String(count).padStart(5)}  ${bar}`)
  }

  // Write stats file
  const statsData = {
    generatedAt: new Date().toISOString(),
    totalRepos: statsSource.length,
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
