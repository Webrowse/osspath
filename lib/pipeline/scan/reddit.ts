import { classifyRustSignal, scoreJobText, shouldQueue } from "@/lib/admin/prefilter"
import type { ScanResult, Candidate, ScanContext } from "@/lib/pipeline/types"
import type { ScanLog } from "@/lib/admin/types"
import { sleep, extractMinimalJob } from "./shared"

/**
 * Reddit r/rust scanner core.
 *
 * News (Category 1): new-post JSON is already structured (title, url, score),
 * parsed deterministically — no DeepSeek. Jobs (from Who's Hiring comments) are
 * scored by the deterministic prefilter and extracted with extractMinimalJob;
 * the deterministic result is treated as complete, so no DeepSeek here either.
 * ctx.isKnown skips already-published or blocklisted URLs before adding.
 */

export async function collectReddit(ctx: ScanContext): Promise<ScanResult> {
  const log: ScanLog = {
    source: "reddit-rust", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }
  const items: Candidate[] = []
  const headers = { "User-Agent": "osspath.com/scanner 1.0" }

  // ── 1. Who's Hiring threads → jobs (deterministic) ─────────────────────────
  try {
    const searchRes = await fetch(
      "https://www.reddit.com/r/rust/search.json?q=who+is+hiring&sort=new&restrict_sr=on&limit=3",
      { headers, signal: AbortSignal.timeout(15_000), next: { revalidate: 0 } },
    )
    const searchData = await searchRes.json() as any
    const threads: any[] = (searchData?.data?.children ?? []).map((c: any) => c.data)
    log.stages!.hiringThreadsFound = threads.length

    for (const thread of threads.slice(0, 2)) {
      log.notes!.push(`Thread: ${String(thread.title ?? "")}`)
      await sleep(1200)
      const commRes = await fetch(
        `https://www.reddit.com/r/rust/comments/${thread.id}.json?limit=100`,
        { headers, signal: AbortSignal.timeout(15_000), next: { revalidate: 0 } },
      )
      const commData = await commRes.json() as any
      const comments: any[] = (commData?.[1]?.data?.children ?? []).map((c: any) => c.data)

      for (const comment of comments) {
        const text = String(comment.body ?? "")
        if (text.length < 50) continue
        if (classifyRustSignal(text) !== "strong") continue
        const score = scoreJobText(text)
        if (!shouldQueue(score)) continue
        const permalink = `https://reddit.com${String(comment.permalink ?? "")}`
        if (ctx.isKnown(permalink)) { log.skipped++; continue }
        items.push({
          id: `reddit-job-${String(comment.id ?? Math.random().toString(36).slice(2))}`,
          type: "jobs", status: "pending", source: "reddit-rust",
          sourceUrl: permalink, foundAt: new Date().toISOString(),
          confidence: 0.6, score: score.total, whyMatched: score.reasons.join(" · "),
          rawText: text.slice(0, 800), extracted: extractMinimalJob(text),
        })
        log.found++
      }
    }
  } catch (e) {
    log.errors.push(`r/rust hiring search: ${String(e)}`)
  }

  // ── 2. New community posts → news (deterministic) ──────────────────────────
  await sleep(1200)
  try {
    const newRes = await fetch(
      "https://www.reddit.com/r/rust/new.json?limit=25",
      { headers, signal: AbortSignal.timeout(15_000), next: { revalidate: 0 } },
    )
    const newData = await newRes.json() as any
    const posts: any[] = (newData?.data?.children ?? []).map((c: any) => c.data)

    for (const post of posts) {
      if (post.is_self) continue
      if ((post.score ?? 0) < 20) continue
      const href = String(post.url ?? "")
      if (!href.startsWith("http") || href.includes("reddit.com")) continue
      if (/github\.com\/[^/]+\/[^/]+\/?$/.test(href)) continue
      if (ctx.isKnown(href)) { log.skipped++; continue }
      items.push({
        id: `reddit-news-${String(post.id ?? Math.random().toString(36).slice(2))}`,
        type: "news", status: "pending", source: "reddit-rust",
        sourceUrl: `https://reddit.com${String(post.permalink ?? "")}`,
        foundAt: new Date().toISOString(),
        confidence: Math.min(0.45 + (post.score ?? 0) / 500, 0.85),
        score: 0.6, whyMatched: `r/rust — ${post.score ?? 0} upvotes`,
        rawText: String(post.title ?? ""),
        extracted: {
          title: String(post.title ?? ""), href, kind: "Discussion",
          date: new Date().toISOString().slice(0, 10), source: "reddit", blurb: "",
        },
      })
      log.found++
    }
  } catch (e) {
    log.errors.push(`r/rust community posts: ${String(e)}`)
  }

  log.finishedAt = new Date().toISOString()
  return { log, items }
}
