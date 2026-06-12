/**
 * Fetch Rust job opportunities from the latest HN "Who is Hiring?" thread.
 *
 * Usage:
 *   npm run hn-opps
 *   # or dry-run (no DB writes):
 *   npm run hn-opps -- --dry-run
 *
 * How it works:
 *   1. Algolia HN Search API → find the most recent "Ask HN: Who is Hiring?" thread
 *   2. Firebase HN API        → fetch all top-level comments (job posts)
 *   3. Filter for Rust mentions via regex
 *   4. Parse company name, location, remote, salary, level
 *   5. Compute quality score
 *   6. Upsert into opportunities table (dedup by source + sourceId)
 */

import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config()

import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import type { ExperienceLevel, RustSignal } from "@prisma/client"
import { computeBaseQualityScore } from "../lib/score-opportunity"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const DRY_RUN = process.argv.includes("--dry-run")

// ─── Step 1: Find current month's thread via Algolia ─────────────────────────

async function findHiringThread(): Promise<{ id: string; title: string; createdAt: Date }> {
  const url =
    "https://hn.algolia.com/api/v1/search?query=Ask+HN+Who+is+Hiring&tags=story,ask_hn&numericFilters=created_at_i>1600000000&hitsPerPage=20"

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Algolia search failed: ${res.status}`)
  const data = (await res.json()) as {
    hits: { objectID: string; title: string; created_at_i: number }[]
  }

  const match = data.hits.find((h) =>
    /Ask HN: Who is Hiring\?/.test(h.title)
  )
  if (!match) throw new Error("Could not find 'Ask HN: Who is Hiring?' thread")

  return {
    id: match.objectID,
    title: match.title,
    createdAt: new Date(match.created_at_i * 1000),
  }
}

// ─── Step 2: Fetch all top-level comments via Firebase ───────────────────────

interface HNItem {
  id: number
  by?: string
  text?: string
  time?: number
  kids?: number[]
  dead?: boolean
  deleted?: boolean
}

async function fetchItem(id: number): Promise<HNItem | null> {
  const res = await fetch(
    `https://hacker-news.firebaseio.com/v0/item/${id}.json`
  )
  if (!res.ok) return null
  return res.json()
}

async function fetchTopLevelComments(threadId: string): Promise<HNItem[]> {
  const thread = await fetchItem(Number(threadId))
  if (!thread?.kids?.length) return []

  console.log(`  Found ${thread.kids.length} top-level comments in thread ${threadId}`)

  const BATCH = 30
  const results: HNItem[] = []
  for (let i = 0; i < thread.kids.length; i += BATCH) {
    const batch = thread.kids.slice(i, i + BATCH)
    const items = await Promise.all(batch.map(fetchItem))
    results.push(...items.filter((x): x is HNItem => x !== null && !x.dead && !x.deleted && !!x.text))
    process.stdout.write(`\r  Fetched ${Math.min(i + BATCH, thread.kids.length)}/${thread.kids.length}`)
  }
  console.log()
  return results
}

// ─── Step 3: Filter for Rust mentions ────────────────────────────────────────

const RUST_CORE_RE = /\brust\b.*\bprimary\b|\bprimary\b.*\brust\b|100%\s*rust|written\s+in\s+rust|all\s+rust|rust[\s-]first|rust\s+core/i
const RUST_HIGH_RE = /\bheavy\s+rust\b|\brust[\s-]heavy\b|\brust[\s-]focused\b|\brust\s+codebase\b/i
const RUST_MEDIUM_RE = /\brust\b/i
const RUST_LOW_RE = /\bwasm\b.*rust|\bwebassembly\b.*rust/i

function detectRustSignal(text: string): RustSignal | null {
  if (RUST_CORE_RE.test(text)) return "CORE"
  if (RUST_HIGH_RE.test(text)) return "HIGH"
  if (RUST_MEDIUM_RE.test(text)) return "MEDIUM"
  if (RUST_LOW_RE.test(text)) return "LOW"
  return null
}

// ─── Step 4: Parse job details ────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim()
}

function parseCompanyName(text: string): string {
  // First line of the post is usually "CompanyName | Title | Location | ..."
  const firstLine = text.split("\n")[0].trim()
  const parts = firstLine.split(/\s*\|\s*/)
  return parts[0].replace(/^[*_]+|[*_]+$/g, "").trim().slice(0, 80)
}

function parseTitle(text: string): string {
  const firstLine = text.split("\n")[0].trim()
  const parts = firstLine.split(/\s*\|\s*/)
  if (parts.length >= 2) return parts[1].replace(/^[*_]+|[*_]+$/g, "").trim().slice(0, 120)
  return "Software Engineer"
}

function parseLocation(text: string): string | null {
  const firstLine = text.split("\n")[0]
  // Look for known location patterns
  const locMatch = firstLine.match(/\|\s*([A-Z][^|]+(?:Remote|NYC|SF|London|Berlin|Toronto|Austin|Seattle|Boston)[^|]*)\s*(?:\||$)/i)
  if (locMatch) return locMatch[1].trim().slice(0, 100)
  return null
}

function parseIsRemote(text: string): boolean {
  return /\bremote\b/i.test(text.split("\n")[0])
}

function parseSalary(text: string): string | null {
  const m = text.match(/\$[\d,]+(?:k|K)?(?:\s*[-–]\s*\$?[\d,]+(?:k|K)?)?(?:\s*\/\s*(?:year|yr|annual))?/i)
  return m ? m[0].trim() : null
}

const LEVEL_PATTERNS: [RegExp, ExperienceLevel][] = [
  [/\b(?:intern|internship|co-op)\b/i, "INTERN"],
  [/\b(?:junior|entry[\s-]?level|new\s+grad(?:uate)?|0-2\s+years?)\b/i, "JUNIOR"],
  [/\b(?:staff|principal|distinguished)\b/i, "STAFF"],
  [/\b(?:senior|sr\.?|lead)\b/i, "SENIOR"],
  [/\b(?:mid[\s-]?level|mid|intermediate|2-5\s+years?)\b/i, "MID"],
]

function parseExperienceLevel(text: string): ExperienceLevel | null {
  for (const [re, level] of LEVEL_PATTERNS) {
    if (re.test(text)) return level
  }
  return null
}

function parseIsJuniorFriendly(text: string, level: ExperienceLevel | null): boolean {
  if (level === "INTERN" || level === "JUNIOR") return true
  return /\b(?:open\s+to\s+junior|junior[\s-]friendly|new\s+grads?\s+welcome|entry[\s-]level\s+ok)\b/i.test(text)
}

function parseHasOssPath(text: string): boolean {
  return /\b(?:open[\s-]source|open\s+source|oss|github\.com\/|contribute\s+to\s+oss|we\s+open[\s-]source)\b/i.test(text)
}

function parseTags(text: string): string[] {
  const tags: string[] = []
  if (/\brust\b/i.test(text)) tags.push("Rust")
  if (/\bwasm|webassembly\b/i.test(text)) tags.push("WASM")
  if (/\bkubernetes|k8s\b/i.test(text)) tags.push("Kubernetes")
  if (/\bdistributed\b/i.test(text)) tags.push("Distributed Systems")
  if (/\bml|machine\s+learning\b/i.test(text)) tags.push("ML")
  if (/\binfrastructure|infra\b/i.test(text)) tags.push("Infrastructure")
  if (/\bsecurity\b/i.test(text)) tags.push("Security")
  if (/\bdatabase|postgres|mysql|sqlite\b/i.test(text)) tags.push("Databases")
  if (/\bnetwork(?:ing)?\b/i.test(text)) tags.push("Networking")
  return tags.slice(0, 6)
}

// ─── Step 5: Process and upsert ───────────────────────────────────────────────

async function processComment(
  comment: HNItem,
  threadId: string,
  threadDate: Date
): Promise<{ inserted: boolean; reason?: string }> {
  const rawText = comment.text ?? ""
  const text = stripHtml(rawText)

  const rustSignal = detectRustSignal(text)
  if (!rustSignal) return { inserted: false, reason: "no Rust mention" }

  // Skip very short posts (bots, deleted, etc.)
  if (text.length < 80) return { inserted: false, reason: "too short" }

  const sourceId = String(comment.id)

  // Dedup check
  const existing = await prisma.opportunity.findFirst({
    where: { source: "HN_HIRING", sourceId },
  })
  if (existing) {
    // Still update lastSeenAt to keep it fresh
    await prisma.opportunity.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date() },
    })
    return { inserted: false, reason: "already exists" }
  }

  const companyName = parseCompanyName(text)
  const title = parseTitle(text)
  const location = parseLocation(text)
  const isRemote = parseIsRemote(text)
  const salary = parseSalary(text)
  const experienceLevel = parseExperienceLevel(text)
  const isJuniorFriendly = parseIsJuniorFriendly(text, experienceLevel)
  const hasOssPath = parseHasOssPath(text)
  const tags = parseTags(text)

  // Try to link to a Company record
  const company = await prisma.company.findFirst({
    where: { name: { contains: companyName.split(/\s/)[0], mode: "insensitive" } },
    select: { id: true, juniorAccessible: true, openSourceRepo: true },
  })

  const baseQualityScore = computeBaseQualityScore({
    rustSignal,
    experienceLevel,
    isRemote,
    hasOssPath,
    company: company ?? null,
  })

  // Quality floor: don't pollute the feed with low-signal HN comments
  const QUALITY_FLOOR = 58
  if (baseQualityScore < QUALITY_FLOOR) {
    return { inserted: false, reason: `score ${baseQualityScore} below floor ${QUALITY_FLOOR}` }
  }

  if (DRY_RUN) {
    console.log(`  [DRY] ${title} @ ${companyName} (${rustSignal}, score=${baseQualityScore})`)
    return { inserted: true }
  }

  await prisma.opportunity.create({
    data: {
      source: "HN_HIRING",
      sourceId,
      sourceUrl: `https://news.ycombinator.com/item?id=${comment.id}`,
      title,
      companyName,
      companyId: company?.id ?? null,
      bodyText: text.slice(0, 8000),
      location,
      salary,
      isRemote,
      tags,
      experienceLevel,
      rustSignal,
      baseQualityScore,
      isJuniorFriendly,
      hasOssPath,
      postedAt: comment.time ? new Date(comment.time * 1000) : threadDate,
      lastSeenAt: new Date(),
    },
  })

  return { inserted: true }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`HN Opportunities Fetcher${DRY_RUN ? " [DRY RUN]" : ""}`)
  console.log("─".repeat(50))

  console.log("Finding latest 'Who is Hiring?' thread...")
  const thread = await findHiringThread()
  console.log(`  Thread: "${thread.title}" (id=${thread.id})`)
  console.log(`  Posted: ${thread.createdAt.toDateString()}`)

  console.log("\nFetching comments...")
  const comments = await fetchTopLevelComments(thread.id)
  console.log(`  Total top-level comments: ${comments.length}`)

  console.log("\nProcessing Rust opportunities...")
  let inserted = 0
  let skipped = 0

  for (const comment of comments) {
    const result = await processComment(comment, thread.id, thread.createdAt)
    if (result.inserted) {
      inserted++
    } else {
      skipped++
    }
  }

  const total = await prisma.opportunity.count({ where: { source: "HN_HIRING" } })
  console.log(`\nResults:`)
  console.log(`  Inserted: ${inserted}`)
  console.log(`  Skipped:  ${skipped}`)
  console.log(`  Total HN opportunities in DB: ${total}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
