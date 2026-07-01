import { classifyRustSignal, scoreJobText, shouldQueue } from "@/lib/admin/prefilter"
import { extractWithDeepSeek } from "@/lib/admin/deepseek"
import type { ScanResult, Candidate, ScanContext } from "@/lib/pipeline/types"
import type { ScanLog } from "@/lib/admin/types"
import { sleep, stripHtml, extractMinimalJob, estimateConfidence } from "./shared"
import { ghFetch, mapRepoResponse, ossJunkFilter, buildOSSExtracted, extractGitHubRepoUrls } from "./github"

/**
 * This Week in Rust scanner core — mixed categories, handled per section:
 *   - Crate of the Week / Call for Participation → OSS (Category 1, deterministic)
 *   - Events (Category 2: deterministic first, DeepSeek only when incomplete)
 *   - News links (deterministic: title + href)
 *   - Jobs (Category 3: prefilter then DeepSeek)
 * Page HTML is held in memory only. ctx.isKnown skips known/blocklisted URLs.
 */

async function twirFetchOSSRepos(urls: string[], issueUrl: string, label: string, ctx: ScanContext): Promise<Candidate[]> {
  const items: Candidate[] = []
  for (const url of urls) {
    const m = url.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!m) continue
    if (ctx.isKnown(url)) continue
    const [, owner, repo] = m
    try {
      const r = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`) as Record<string, unknown>
      const mapped = mapRepoResponse(r)
      const { junk } = ossJunkFilter(mapped)
      if (junk || (mapped.stargazers_count ?? 0) < 10) continue
      items.push({
        id: `twir-oss-${owner}-${repo}`,
        type: "oss", status: "pending", source: "twir",
        sourceUrl: issueUrl, foundAt: new Date().toISOString(),
        confidence: 0.9, score: 0.9, whyMatched: `Featured in TWIR (${label})`,
        rawText: url,
        extracted: { ...buildOSSExtracted(mapped), labels: [label] },
      })
      await sleep(400)
    } catch { continue }
  }
  return items
}

export async function collectTWIR(ctx: ScanContext): Promise<ScanResult> {
  const log: ScanLog = {
    source: "twir", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }
  const items: Candidate[] = []
  const useAI = !!process.env.DEEPSEEK_API_KEY

  // ── Fetch latest issue ─────────────────────────────────────────────────────
  let issueUrl: string
  try {
    const rssRes = await fetch("https://this-week-in-rust.org/rss.xml", { signal: AbortSignal.timeout(15_000), next: { revalidate: 0 } })
    const rssText = await rssRes.text()
    const linkMatch = rssText.match(/<link>(https:\/\/this-week-in-rust\.org\/blog\/[^<]+)<\/link>/)
    if (!linkMatch) {
      log.errors.push("Could not parse TWIR RSS feed")
      log.finishedAt = new Date().toISOString()
      return { log, items }
    }
    issueUrl = linkMatch[1]
    log.notes!.push(`Latest issue: ${issueUrl}`)
  } catch (e) {
    log.errors.push(`RSS fetch failed: ${String(e)}`)
    log.finishedAt = new Date().toISOString()
    return { log, items }
  }

  let html: string
  try {
    const htmlRes = await fetch(issueUrl, { signal: AbortSignal.timeout(20_000), next: { revalidate: 0 } })
    html = await htmlRes.text()
  } catch (e) {
    log.errors.push(`Issue fetch failed: ${String(e)}`)
    log.finishedAt = new Date().toISOString()
    return { log, items }
  }

  function section(id: string): string {
    const re = new RegExp(`<h2[^>]*id="${id}"[^>]*>[\\s\\S]*?</h2>([\\s\\S]*?)(?=<h[12][^>]*id=|$)`, "i")
    const m = html.match(re)
    return m ? m[1] : ""
  }

  // ── Jobs (Category 3) ──────────────────────────────────────────────────────
  const jobsSection = section("jobs")
  if (jobsSection.length > 50) {
    let entries = Array.from(jobsSection.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
      .map((m) => stripHtml(m[1])).filter((s) => s.trim().length > 30)
    if (entries.length === 0) {
      const pText = stripHtml(jobsSection).toLowerCase()
      if (pText.includes("who's hiring thread") || pText.includes("r/rust")) {
        log.notes!.push("TWIR now redirects jobs to r/rust Who's Hiring — use Reddit scanner.")
      } else {
        entries = stripHtml(jobsSection).split(/(?<=\.)\s+(?=[A-Z])/g)
          .filter((s) => /hiring|rust|engineer|developer|apply/i.test(s) && s.length > 50)
      }
    }
    let rustFiltered = 0
    for (const text of entries.slice(0, 30)) {
      if (classifyRustSignal(text) !== "strong") { rustFiltered++; continue }
      const score = scoreJobText(text)
      if (!shouldQueue(score)) continue
      let extracted: Record<string, unknown>
      if (useAI) {
        const result = await extractWithDeepSeek("jobs", text)
        extracted = (result.ok && result.data) ? result.data : extractMinimalJob(text)
      } else {
        extracted = extractMinimalJob(text)
      }
      items.push({
        id: `twir-job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "jobs", status: "pending", source: "twir",
        sourceUrl: issueUrl, foundAt: new Date().toISOString(),
        confidence: estimateConfidence(extracted), score: score.total,
        whyMatched: score.reasons.join(" · "), rawText: text.slice(0, 1000), extracted,
      })
      log.found++
    }
    log.stages!.jobsRustFiltered = rustFiltered
  }

  // ── Crate of the Week + Call for Participation → OSS (Category 1) ───────────
  const cotwHtml = section("crate-of-the-week")
  if (cotwHtml) {
    const urls = extractGitHubRepoUrls(cotwHtml)
    log.stages!.crateOfWeekRepos = urls.length
    const oss = await twirFetchOSSRepos(urls.slice(0, 3), issueUrl, "crate-of-week", ctx)
    items.push(...oss); log.found += oss.length
  }
  const cfpHtml = section("call-for-participation")
  if (cfpHtml) {
    const urls = extractGitHubRepoUrls(cfpHtml)
    log.stages!.cfpRepos = urls.length
    const oss = await twirFetchOSSRepos(urls.slice(0, 12), issueUrl, "cfp", ctx)
    items.push(...oss); log.found += oss.length
  }

  // ── Events (Category 2: deterministic first, DeepSeek only when incomplete) ─
  const eventsHtml = section("events")
  if (eventsHtml.length > 50) {
    for (const m of Array.from(eventsHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).slice(0, 30)) {
      const rawLi = m[1]
      const text = stripHtml(rawLi).trim()
      if (text.length < 20) continue
      const linkMatch = rawLi.match(/href="([^"]+)"/)
      if (!linkMatch || !linkMatch[1].startsWith("http")) continue
      const href = linkMatch[1]
      if (ctx.isKnown(href)) { log.skipped++; continue }
      const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/)
      const location = text.match(/\|\s*([^|]+)\s*\|/)?.[1]?.trim() ?? ""

      // Deterministic first.
      const draft: Record<string, unknown> = {
        name: text.split("|").pop()?.trim() ?? text,
        href,
        date: dateMatch?.[1] ?? "",
        format: /virtual|online/i.test(text) ? "Online" : "In-Person",
        location,
      }
      // Fallback only if the date could not be parsed and AI is available.
      let extracted = draft
      if (useAI && !draft.date) {
        const result = await extractWithDeepSeek("events", text)
        if (result.ok && result.data) extracted = result.data
      }
      items.push({
        id: `twir-event-${href.replace(/[^a-z0-9]/gi, "").slice(-28)}`,
        type: "events", status: "pending", source: "twir",
        sourceUrl: issueUrl, foundAt: new Date().toISOString(),
        confidence: 0.85, score: 0.8, whyMatched: "Listed in TWIR events section",
        rawText: text.slice(0, 400), extracted,
      })
      log.found++
    }
  }

  // ── News & Blog Posts → news (deterministic) ───────────────────────────────
  const newsHtml = section("updates-from-rust-community") || section("news-blog-posts")
  if (newsHtml.length > 50) {
    const linkRe = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
    let lm: RegExpExecArray | null
    while ((lm = linkRe.exec(newsHtml)) !== null) {
      const [, href, rawTitle] = lm
      const title = stripHtml(rawTitle).trim()
      if (!title || title.length < 10) continue
      if (!href.startsWith("http") || href.includes("this-week-in-rust.org")) continue
      if (ctx.isKnown(href)) { log.skipped++; continue }
      items.push({
        id: `twir-news-${href.replace(/[^a-z0-9]/gi, "").slice(-24)}`,
        type: "news", status: "pending", source: "twir",
        sourceUrl: issueUrl, foundAt: new Date().toISOString(),
        confidence: 0.75, score: 0.7, whyMatched: "Linked in TWIR news section",
        rawText: title,
        extracted: { title, href, kind: "Blog", date: new Date().toISOString().slice(0, 10), source: "twir", blurb: "" },
      })
      log.found++
    }
  }

  log.finishedAt = new Date().toISOString()
  return { log, items }
}
