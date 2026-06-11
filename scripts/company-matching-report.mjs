#!/usr/bin/env node
// Produces COMPANY_MATCHING_REPORT.md from current companies.json + oss.json
import { readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const companies = JSON.parse(readFileSync(join(ROOT, "content/companies.json"), "utf8"))
const oss       = JSON.parse(readFileSync(join(ROOT, "content/oss.json"), "utf8"))

function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

// Build owner → repos index
const ownerIndex = {}
for (const r of oss) {
  if (!r.owner) continue
  const k = r.owner.toLowerCase()
  if (!ownerIndex[k]) ownerIndex[k] = []
  ownerIndex[k].push(r)
}

const matched   = []
const unmatched = []
const noOrg     = []

for (const c of companies) {
  if (!c.github_org) {
    noOrg.push(c)
    continue
  }
  const repos = (ownerIndex[c.github_org.toLowerCase()] ?? [])
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
  if (repos.length > 0) {
    matched.push({ company: c, repos })
  } else {
    unmatched.push(c)
  }
}

matched.sort((a, b) => {
  const aS = a.repos.reduce((s, r) => s + (r.stars ?? 0), 0)
  const bS = b.repos.reduce((s, r) => s + (r.stars ?? 0), 0)
  return bS - aS
})

let md = `# Company Matching Report

Generated from content/companies.json × content/oss.json.
Corpus: ${oss.length} repos · ${companies.length} companies

---

## Matched companies (${matched.length})

Companies with \`github_org\` that maps to repos in the OSS corpus.

| Company | github_org | Repos | Total ★ | Top repo |
|---|---|---|---|---|
`

for (const { company: c, repos } of matched) {
  const totalStars = repos.reduce((s, r) => s + (r.stars ?? 0), 0)
  const top = repos[0]
  md += `| **${c.name}** | \`${c.github_org}\` | ${repos.length} | ${fmt(totalStars)} | [${top.name}](https://github.com/${top.owner}/${top.name}) (${fmt(top.stars ?? 0)}★) |\n`
}

md += `
---

## Unmatched companies (${unmatched.length})

Companies with \`github_org\` set but no repos found in the corpus.
These companies use Rust but their repos are not in the curated corpus.

| Company | github_org | Notes |
|---|---|---|
`

for (const c of unmatched) {
  md += `| **${c.name}** | \`${c.github_org}\` | No repos in corpus — may need corpus addition |\n`
}

md += `
---

## No github_org assigned (${noOrg.length})

Companies without a \`github_org\` field. Profile pages exist but show no OSS footprint.

| Company | Sector | Notes |
|---|---|---|
`

for (const c of noOrg) {
  md += `| **${c.name}** | ${c.sector} | Needs manual \`github_org\` assignment |\n`
}

md += `
---

## Summary

| Status | Count |
|---|---|
| Matched (github_org + corpus repos) | ${matched.length} |
| Unmatched (github_org set, no corpus repos) | ${unmatched.length} |
| No github_org | ${noOrg.length} |
| **Total** | **${companies.length}** |

**OSS coverage:** ${matched.length} of ${companies.length} companies (${Math.round(100*matched.length/companies.length)}%) have graph edges to the OSS corpus.

**Total graph edges created:** ${matched.reduce((s, m) => s + m.repos.length, 0)} repo→company connections across ${matched.reduce((s, m) => s + m.repos.reduce((r, repo) => r + (repo.stars ?? 0), 0), 0)} total stars.
`

writeFileSync(join(ROOT, "COMPANY_MATCHING_REPORT.md"), md)
console.log("Written: COMPANY_MATCHING_REPORT.md")
console.log(`Matched: ${matched.length} / ${companies.length}`)
console.log(`Unmatched: ${unmatched.length}`)
console.log(`No org: ${noOrg.length}`)
