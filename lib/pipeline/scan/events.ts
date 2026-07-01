import { extractWithDeepSeek } from "@/lib/admin/deepseek"
import type { ScanResult, Candidate, ScanContext } from "@/lib/pipeline/types"
import type { ScanLog } from "@/lib/admin/types"
import { hnSearch, type HNStoryHit } from "./hn-search"

/**
 * Events scanner core — Category 2 (semi-structured).
 *
 * Event stories are found via HN search. Title and URL are structured, but the
 * date, month, and meta need semantic parsing from free-form titles, so DeepSeek
 * extracts them for genuinely new events (skipped for known ones via
 * ctx.isKnown).
 */

const QUERIES = [
  "RustConf 2025",
  "EuroRust 2025",
  "Oxidize conference Rust",
  "Rust Nation conference",
  "Rust workshop conference 2025",
]

export async function collectEvents(ctx: ScanContext): Promise<ScanResult> {
  const log: ScanLog = {
    source: "events", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }
  const items: Candidate[] = []

  const stories: HNStoryHit[] = []
  const seenIds = new Set<string>()
  for (const q of QUERIES) {
    const hits = await hnSearch(q, 5)
    log.stages![`hn_${q.slice(0, 15)}`] = hits.length
    for (const h of hits) {
      if (!seenIds.has(h.objectID)) { seenIds.add(h.objectID); stories.push(h) }
    }
  }
  log.found = stories.length

  for (const story of stories) {
    const sourceUrl = `https://news.ycombinator.com/item?id=${story.objectID}`
    const href = story.url || sourceUrl
    if (ctx.isKnown(href) || ctx.isKnown(sourceUrl)) { log.skipped++; continue }

    const text = [story.title, story.url ? `URL: ${story.url}` : ""].filter(Boolean).join("\n")
    const result = await extractWithDeepSeek("events", text)
    if (!result.ok || !result.data) { log.skipped++; continue }

    items.push({
      id: `hn-event-${story.objectID}`,
      type: "events", status: "pending", source: "hn-events",
      sourceUrl, foundAt: story.created_at ?? new Date().toISOString(),
      confidence: 0.65, whyMatched: story.title ?? "",
      rawText: text,
      extracted: { ...result.data, href: result.data.href || story.url || sourceUrl },
    })
  }

  log.stages!.queued = items.length
  log.finishedAt = new Date().toISOString()
  return { log, items }
}
