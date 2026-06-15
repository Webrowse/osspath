/**
 * Repository routing integrity audit.
 * Run: npm run audit:repos
 *
 * Verifies every record in content/oss.json can produce a valid /oss/[owner]/[repo] route.
 *
 * Checks:
 *   1. owner field present and not a sentinel value (unknown/null/undefined/"")
 *   2. name field present
 *   3. href field present and well-formed GitHub URL
 *   4. href owner matches stored owner (case-sensitive)
 *   5. href repo name matches stored name (case-sensitive)
 *   6. No duplicate owner/name pairs (would shadow routes)
 */

import { readFileSync } from "fs"
import { join } from "path"

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawRepo {
  name?: string
  owner?: string
  href?: string
  [key: string]: unknown
}

// ── Constants ─────────────────────────────────────────────────────────────────

const INVALID_OWNER_VALUES = new Set(["unknown", "null", "undefined", ""])
const GITHUB_RE = /^https:\/\/github\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?$/

// ── Helpers ───────────────────────────────────────────────────────────────────

let errors   = 0
let warnings = 0

function err(ctx: string, msg: string) {
  console.error(`  ✗ [${ctx}] ${msg}`)
  errors++
}

function warn(ctx: string, msg: string) {
  console.warn(`  ⚠ [${ctx}] ${msg}`)
  warnings++
}

function ok(msg: string) {
  console.log(`  ✓ ${msg}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

const ROOT  = process.cwd()
const path  = join(ROOT, "content/oss.json")
const repos = JSON.parse(readFileSync(path, "utf-8")) as RawRepo[]

console.log(`\nRepository Routing Integrity Audit`)
console.log(`─────────────────────────────────────────────────────`)
console.log(`Corpus: ${repos.length} records in content/oss.json\n`)

// ── Check 1–5: Per-record validation ─────────────────────────────────────────

console.log(`[1/6] Checking required fields and href consistency…`)

const routeSet = new Set<string>()
const broken: { record: string; issues: string[] }[] = []

for (const r of repos) {
  const id     = r.owner && r.name ? `${r.owner}/${r.name}` : `(${r.href ?? "no href"})`
  const issues: string[] = []

  // owner
  if (!r.owner) {
    issues.push("missing owner")
  } else if (INVALID_OWNER_VALUES.has(r.owner)) {
    issues.push(`owner is sentinel value "${r.owner}"`)
  }

  // name
  if (!r.name) {
    issues.push("missing name")
  }

  // href
  if (!r.href) {
    issues.push("missing href")
  } else {
    const m = r.href.match(GITHUB_RE)
    if (!m) {
      issues.push(`href is not a valid GitHub URL: "${r.href}"`)
    } else {
      const hrefOwner = m[1]
      const hrefName  = m[2]

      if (r.owner && r.owner !== hrefOwner) {
        issues.push(`owner "${r.owner}" does not match href owner "${hrefOwner}"`)
      }
      if (r.name && r.name !== hrefName) {
        issues.push(`name "${r.name}" does not match href name "${hrefName}"`)
      }
    }
  }

  if (issues.length > 0) {
    broken.push({ record: id, issues })
  }
}

if (broken.length === 0) {
  ok(`All ${repos.length} records have valid owner, name, and href`)
} else {
  for (const b of broken) {
    for (const issue of b.issues) {
      err(b.record, issue)
    }
  }
}

// ── Check 6: Duplicate routes ─────────────────────────────────────────────────

console.log(`\n[2/6] Checking for duplicate owner/name pairs…`)

const seen = new Map<string, number>()
for (const r of repos) {
  if (!r.owner || !r.name) continue
  const slug = `${r.owner}/${r.name}`
  seen.set(slug, (seen.get(slug) ?? 0) + 1)
}

const duplicates = [...seen.entries()].filter(([, count]) => count > 1)
if (duplicates.length === 0) {
  ok(`No duplicate routes`)
} else {
  for (const [slug, count] of duplicates) {
    err(slug, `appears ${count} times — routes would shadow each other`)
  }
}

// ── Check 3: Sentinel name/owner values that would generate broken URLs ───────

console.log(`\n[3/6] Checking for sentinel owner/name values…`)

const sentinelRecords = repos.filter(r =>
  (r.owner && INVALID_OWNER_VALUES.has(r.owner)) ||
  (r.name  && INVALID_OWNER_VALUES.has(r.name))
)
if (sentinelRecords.length === 0) {
  ok(`No sentinel values found`)
} else {
  for (const r of sentinelRecords) {
    err(`${r.owner}/${r.name}`, `sentinel value would generate broken route /oss/${r.owner}/${r.name}`)
  }
}

// ── Check 4: Routes that generateStaticParams would produce ──────────────────

console.log(`\n[4/6] Checking route generation coverage…`)

const routable     = repos.filter(r => r.owner && r.name && !INVALID_OWNER_VALUES.has(r.owner))
const unroutable   = repos.filter(r => !r.owner || !r.name || INVALID_OWNER_VALUES.has(r.owner ?? ""))

ok(`Routable records (will appear in generateStaticParams): ${routable.length}`)
if (unroutable.length > 0) {
  for (const r of unroutable) {
    err(`${r.name ?? "(no name)"}`, `excluded from route generation — would 404 if linked internally`)
  }
} else {
  ok(`Unroutable records: 0`)
}

// ── Check 5: Owner/name extraction from href for ownerless records ─────────────

console.log(`\n[5/6] Checking href extractability for any ownerless records…`)

const ownerless = repos.filter(r => !r.owner)
if (ownerless.length === 0) {
  ok(`All records have owner`)
} else {
  for (const r of ownerless) {
    const m = r.href?.match(GITHUB_RE)
    if (m) {
      warn(`${r.name}`, `missing owner; can be derived from href: "${m[1]}"`)
    } else {
      err(`${r.name ?? "(no name)"}`, `missing owner AND href is not a parseable GitHub URL`)
    }
  }
}

// ── Check 6: Non-GitHub hrefs (cannot derive owner) ──────────────────────────

console.log(`\n[6/6] Checking for non-GitHub hrefs…`)

const nonGitHub = repos.filter(r => r.href && !r.href.startsWith("https://github.com/"))
if (nonGitHub.length === 0) {
  ok(`All hrefs point to github.com`)
} else {
  for (const r of nonGitHub) {
    warn(`${r.owner}/${r.name}`, `href is not a GitHub URL: "${r.href}"`)
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n─────────────────────────────────────────────────────`)
console.log(`Total records : ${repos.length}`)
console.log(`Routable      : ${routable.length}`)
console.log(`Unroutable    : ${unroutable.length}`)
console.log(`Errors        : ${errors}`)
console.log(`Warnings      : ${warnings}`)

if (errors > 0) {
  console.error(`\n✗ Audit FAILED — ${errors} error(s) found.`)
  console.error(`  Fix all errors before deploying to prevent broken internal links.\n`)
  process.exit(1)
} else if (warnings > 0) {
  console.warn(`\n⚠ Audit passed with ${warnings} warning(s).\n`)
  process.exit(0)
} else {
  console.log(`\n✓ Audit passed — all ${repos.length} repository routes are valid.\n`)
  process.exit(0)
}
