import { scoreJobText, shouldQueue } from "@/lib/admin/prefilter"
import type { ScanResult, Candidate, ScanContext } from "@/lib/pipeline/types"
import type { ScanLog } from "@/lib/admin/types"
import { sleep, stripHtml } from "./shared"
import { readPublished } from "../store"

/**
 * Company Careers scanner core — Category 3 source, deterministic extraction.
 *
 * Greenhouse and Lever return a structured envelope (title, location, url) plus
 * a free-form description. A deterministic Rust prefilter runs first, and the
 * fields we publish (title, company, href, location, remote) come straight from
 * the structured API — a complete candidate — so DeepSeek is not needed. Job
 * HTML is held in memory only. ctx.isKnown skips already-published postings.
 */

async function tryGreenhouse(slug: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`,
      { signal: AbortSignal.timeout(8_000), next: { revalidate: 0 } },
    )
    if (!res.ok) return []
    const data = await res.json() as { jobs?: any[] }
    return data.jobs ?? []
  } catch { return [] }
}

async function tryLever(slug: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
      { signal: AbortSignal.timeout(8_000), next: { revalidate: 0 } },
    )
    if (!res.ok) return []
    return await res.json() as any[]
  } catch { return [] }
}

export async function collectCareers(ctx: ScanContext): Promise<ScanResult> {
  const log: ScanLog = {
    source: "company-careers", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }
  const items: Candidate[] = []

  let companies: Array<{ slug?: string; name?: string; href?: string }>
  try {
    companies = await readPublished("companies") as typeof companies
  } catch (e) {
    log.errors.push(`Failed to read companies: ${String(e)}`)
    log.finishedAt = new Date().toISOString()
    return { log, items }
  }

  let tried = 0
  for (const co of companies) {
    const slug = String(co.slug ?? "")
    if (!slug) continue
    tried++

    const [ghJobs, levJobs] = await Promise.all([tryGreenhouse(slug), tryLever(slug)])
    const allJobs = [...ghJobs, ...levJobs]

    for (const job of allJobs) {
      const title = String(job.title ?? job.text ?? "")
      const desc = stripHtml(String(job.content ?? job.description ?? job.descriptionPlain ?? ""))
      const full = `${title} ${desc}`
      if (!/\brust\b/i.test(full)) continue
      const score = scoreJobText(full)
      if (!shouldQueue(score)) continue

      const href = String(job.absolute_url ?? job.hostedUrl ?? "")
      if (href && ctx.isKnown(href)) { log.skipped++; continue }
      const ats = ghJobs.includes(job) ? "Greenhouse" : "Lever"
      items.push({
        id: `careers-${slug}-${String(job.id ?? Math.random().toString(36).slice(2))}`,
        type: "jobs", status: "pending", source: "company-careers",
        sourceUrl: href || String(co.href ?? ""), foundAt: new Date().toISOString(),
        confidence: 0.85, score: score.total,
        whyMatched: `${co.name} via ${ats}: ${score.reasons.join(" · ")}`,
        rawText: `${title}\n${desc}`.slice(0, 800),
        extracted: {
          title,
          company: co.name,
          href,
          location: String(job.location?.name ?? job.categories?.location ?? ""),
          remote: /remote/i.test(full),
          type: "Full-time",
        },
      })
      log.found++
    }

    if (tried % 15 === 0) await sleep(500)
  }

  log.stages!.companiesTried = tried
  log.stages!.jobsFound = log.found
  log.finishedAt = new Date().toISOString()
  return { log, items }
}
