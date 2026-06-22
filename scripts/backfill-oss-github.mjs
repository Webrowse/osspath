/**
 * Backfill script: enrich existing content/oss.json with GitHub metadata.
 *
 * Fetches per-repo GitHub API data for every record in content/oss.json
 * and writes back the following fields (if missing or stale):
 *   stars, forks, openIssuesCount, goodFirstIssuesCount, helpWantedIssuesCount,
 *   language, owner, license, pushedAt, activityTier
 *
 * Derives without API call:
 *   owner (from href)
 *
 * Run:
 *   node scripts/backfill-oss-github.mjs
 *
 * Optional env:
 *   GITHUB_TOKEN — set in .env.local, dramatically increases rate limit (5000/h vs 60/h)
 *   DRY_RUN=1    — print what would change without writing
 */

import { readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

// Load .env.local if present
try {
  const env = readFileSync(join(ROOT, ".env.local"), "utf-8")
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
  }
} catch { /* no .env.local */ }

const DRY_RUN = process.env.DRY_RUN === "1"
const TOKEN   = process.env.GITHUB_TOKEN

const HEADERS = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "osspath.com/backfill",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
}

function computeActivityTier(pushedAt) {
  if (!pushedAt) return "dormant"
  const days = (Date.now() - new Date(pushedAt).getTime()) / 86_400_000
  if (days <= 30)  return "active"
  if (days <= 90)  return "maintenance"
  return "dormant"
}

function ownerFromHref(href) {
  const m = href.match(/github\.com\/([^/]+)\//)
  return m ? m[1] : ""
}

function repoPathFromHref(href) {
  const m = href.match(/github\.com\/([^/]+\/[^/]+)/)
  return m ? m[1] : null
}

async function fetchRepo(fullName) {
  const url = `https://api.github.com/repos/${fullName}`
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15_000) })
  if (res.status === 404) return { notFound: true }
  if (res.status === 403) throw new Error(`Rate-limited fetching ${fullName}. Set GITHUB_TOKEN.`)
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${fullName}`)
  return res.json()
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  const ossPath = join(ROOT, "content", "oss.json")
  const data = JSON.parse(readFileSync(ossPath, "utf-8"))

  console.log(`Loaded ${data.length} records from content/oss.json`)
  console.log(TOKEN ? "Using GITHUB_TOKEN (5000 req/h)" : "No GITHUB_TOKEN — limited to 60 req/h")
  if (DRY_RUN) console.log("DRY RUN — no changes will be written\n")

  const results = []
  let enriched = 0
  let failed = 0
  let notFound = 0

  for (let i = 0; i < data.length; i++) {
    const record = { ...data[i] }
    const repoPath = repoPathFromHref(record.href)

    if (!repoPath) {
      console.warn(`[${i+1}/${data.length}] Cannot parse href: ${record.href}`)
      results.push(record)
      continue
    }

    try {
      const gh = await fetchRepo(repoPath)

      if (gh.notFound) {
        console.warn(`[${i+1}/${data.length}] 404: ${repoPath}`)
        notFound++
        results.push(record)
        continue
      }

      // Apply all objective GitHub metadata
      const updated = {
        ...record,
        stars:                 gh.stargazers_count ?? record.stars ?? null,
        forks:                 gh.forks_count ?? 0,
        openIssuesCount:       gh.open_issues_count ?? 0,
        goodFirstIssuesCount:  gh.good_first_issues_count ?? 0,
        helpWantedIssuesCount: gh.help_wanted_issues_count ?? 0,
        language:              gh.language ?? null,
        owner:                 gh.owner?.login ?? ownerFromHref(record.href),
        license:               gh.license?.spdx_id ?? null,
        pushedAt:              gh.pushed_at ?? record.pushedAt ?? null,
        activityTier:          computeActivityTier(gh.pushed_at ?? record.pushedAt),
      }

      // Log what changed
      const changed = []
      for (const k of ["stars","forks","openIssuesCount","language","owner","license","activityTier"]) {
        if (record[k] !== updated[k]) changed.push(`${k}: ${record[k] ?? "missing"} → ${updated[k]}`)
      }

      if (changed.length > 0) {
        console.log(`[${i+1}/${data.length}] ${repoPath}: ${changed.join(", ")}`)
        enriched++
      } else {
        process.stdout.write(`[${i+1}/${data.length}] ${repoPath} — no change\r`)
      }

      results.push(updated)
    } catch (err) {
      console.error(`[${i+1}/${data.length}] Error for ${repoPath}: ${err.message}`)
      failed++
      results.push(record)
    }

    // Polite delay: ~1 req/s without token, faster with
    await sleep(TOKEN ? 150 : 1100)
  }

  console.log(`\n\nDone. ${enriched} enriched, ${failed} failed, ${notFound} not found.`)

  if (!DRY_RUN) {
    writeFileSync(ossPath, JSON.stringify(results, null, 2) + "\n", "utf-8")
    console.log(`Wrote ${results.length} records to content/oss.json`)
  }

  // Summary report
  console.log("\n── Field coverage after backfill ──")
  const report = ["stars","forks","openIssuesCount","language","owner","license","pushedAt","activityTier"]
  for (const field of report) {
    const present = results.filter(r => r[field] != null && r[field] !== "").length
    console.log(`  ${field}: ${present}/${results.length}`)
  }
}

main().catch(err => {
  console.error("Fatal:", err)
  process.exit(1)
})
