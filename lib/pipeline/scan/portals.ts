import { extractWithDeepSeek } from "@/lib/admin/deepseek"
import type { ScanResult, Candidate, ScanContext } from "@/lib/pipeline/types"
import type { ScanLog } from "@/lib/admin/types"
import { hnSearch } from "./hn-search"

/**
 * Portals scanner core — Category 2 (semi-structured).
 *
 * Seeded job boards are fully structured and parsed deterministically.
 * Additional portals discovered via HN are free-form, so DeepSeek extracts them
 * for genuinely new URLs only (ctx.isKnown).
 */

const PORTAL_SEEDS = [
  {
    name: "LinkedIn — Rust Developer Jobs",
    kind: "General",
    href: "https://www.linkedin.com/jobs/rust-developer-jobs/",
    description: "LinkedIn filtered for Rust developer roles. Largest professional network, high volume of direct employer postings.",
    tags: ["general", "high-volume"],
  },
  {
    name: "Indeed — Rust Developer Jobs",
    kind: "General",
    href: "https://www.indeed.com/q-rust-developer-jobs.html",
    description: "Indeed filtered for Rust developer roles. Broad reach across startups and enterprise.",
    tags: ["general", "high-volume"],
  },
  {
    name: "Glassdoor — Rust Developer Jobs",
    kind: "General",
    href: "https://www.glassdoor.com/Job/rust-developer-jobs-SRCH_KO0,19.htm",
    description: "Glassdoor Rust jobs with salary transparency and company culture data.",
    tags: ["general", "salary-data"],
  },
  {
    name: "We Work Remotely — Rust",
    kind: "Remote-only",
    href: "https://weworkremotely.com/remote-rust-jobs",
    description: "Dedicated Rust section on one of the largest remote job boards.",
    tags: ["remote-only"],
  },
  {
    name: "Arc.dev — Remote Rust Jobs",
    kind: "Remote-only",
    href: "https://arc.dev/remote-jobs/rust",
    description: "Vetted remote Rust developer roles. Screened candidates and employers.",
    tags: ["remote-only", "vetted"],
  },
  {
    name: "Hired — Rust Engineering",
    kind: "Aggregator",
    href: "https://hired.com/jobs/rust",
    description: "Hired's Rust engineering listings. Tech-focused with salary transparency and company bids.",
    tags: ["aggregator", "salary-data"],
  },
]

export async function collectPortals(ctx: ScanContext): Promise<ScanResult> {
  const log: ScanLog = {
    source: "portals", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }
  const items: Candidate[] = []

  // ── 1. Seeded portals (deterministic) ──────────────────────────────────────
  for (const portal of PORTAL_SEEDS) {
    if (ctx.isKnown(portal.href)) { log.skipped++; continue }
    items.push({
      id: `portal-seed-${portal.name.replace(/\W+/g, "-").toLowerCase()}`,
      type: "portals", status: "pending", source: "portal-seed",
      sourceUrl: portal.href, foundAt: new Date().toISOString(),
      confidence: 0.9, whyMatched: `Known Rust job portal — ${portal.kind}`,
      rawText: `${portal.name}: ${portal.description}`,
      extracted: portal,
    })
  }
  log.stages!.seeded = items.length

  // ── 2. HN-discovered portals (free-form → DeepSeek) ────────────────────────
  const hnHits = await hnSearch("rust jobs where apply remote", 10)
  const hnCandidates = hnHits.filter((h) => h.url && !h.url.includes("ycombinator"))
  log.stages!.hnCandidates = hnCandidates.length

  for (const story of hnCandidates.slice(0, 5)) {
    const href = String(story.url ?? "")
    if (ctx.isKnown(href)) { log.skipped++; continue }
    const text = [story.title, `URL: ${story.url}`].join("\n")
    const result = await extractWithDeepSeek("portals", text)
    if (!result.ok || !result.data) continue
    items.push({
      id: `hn-portal-${story.objectID}`,
      type: "portals", status: "pending", source: "hn-portals",
      sourceUrl: `https://news.ycombinator.com/item?id=${story.objectID}`,
      foundAt: story.created_at ?? new Date().toISOString(),
      confidence: 0.5, whyMatched: story.title ?? "",
      rawText: text,
      extracted: { ...result.data, href: result.data.href || story.url },
    })
  }

  log.found = PORTAL_SEEDS.length + hnCandidates.length
  log.stages!.queued = items.length
  log.finishedAt = new Date().toISOString()
  return { log, items }
}
