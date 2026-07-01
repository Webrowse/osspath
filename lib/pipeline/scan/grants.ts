import { extractWithDeepSeek } from "@/lib/admin/deepseek"
import type { ScanResult, Candidate, ScanContext } from "@/lib/pipeline/types"
import type { ScanLog } from "@/lib/admin/types"

/**
 * Grants scanner core — Category 3 (unstructured).
 *
 * Seeded programs are structured and parsed deterministically. Foundation
 * articles are free-form, so DeepSeek extracts a structured candidate from each
 * NEW article (ctx.isKnown skips already-published or blocklisted URLs before
 * the DeepSeek call, so cost scales with new content). Page HTML is held in
 * memory only and never persisted.
 */

function isRealGrantUrl(href: unknown, fallback: string): boolean {
  if (!href || typeof href !== "string") return false
  if (!href.startsWith("http")) return false
  if (href.includes("example.com")) return false
  if (href.includes("ycombinator.com")) return false
  if (href === fallback) return false
  return true
}

// Known Rust grant programs — seeded directly, no scraping needed.
const KNOWN_GRANTS = [
  {
    id: "grant-rustfound-community",
    name: "Rust Foundation Community Grants",
    kind: "Grant",
    description: "Funded work on Rust libraries, tools, and education. Open to individuals and teams worldwide.",
    status: "Open",
    href: "https://foundation.rust-lang.org/grants/",
  },
  {
    id: "grant-rustfound-fellowships",
    name: "Rust Foundation Fellowships",
    kind: "Grant",
    description: "Paid fellowships for contributors who want to work full-time on the Rust compiler, toolchain, or ecosystem.",
    status: "Open",
    href: "https://foundation.rust-lang.org/grants/fellowships/",
  },
]

export async function collectGrants(ctx: ScanContext): Promise<ScanResult> {
  const log: ScanLog = {
    source: "grants", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }
  const items: Candidate[] = []

  // ── 1. Seeded known programs (deterministic) ───────────────────────────────
  for (const grant of KNOWN_GRANTS) {
    items.push({
      id: grant.id, type: "grants", status: "pending",
      source: "grant-seed", sourceUrl: grant.href,
      foundAt: new Date().toISOString(),
      confidence: 0.9, whyMatched: "Known Rust Foundation grant program",
      rawText: `${grant.name}: ${grant.description}`,
      extracted: grant,
    })
  }
  log.stages!.seeded = items.length

  // ── 2. Scrape foundation.rust-lang.org for grant/bounty/fellowship links ────
  const articleLinks: { title: string; href: string }[] = []
  for (const pageUrl of ["https://foundation.rust-lang.org/grants/", "https://foundation.rust-lang.org/news/"]) {
    try {
      const res = await fetch(pageUrl, {
        signal: AbortSignal.timeout(15_000),
        headers: { "User-Agent": "osspath.com/scanner" },
        next: { revalidate: 0 },
      })
      const html = await res.text()
      const linkRe = /<a\s[^>]*href="([^"]+)"[^>]*>([^<]{10,120})<\/a>/gi
      let m: RegExpExecArray | null
      while ((m = linkRe.exec(html)) !== null) {
        const [, href, rawTitle] = m
        const title = rawTitle.trim().replace(/\s+/g, " ")
        const lower = (href + title).toLowerCase()
        if (!lower.includes("grant") && !lower.includes("bounty") && !lower.includes("fellow")) continue
        const full = href.startsWith("http") ? href : `https://foundation.rust-lang.org${href}`
        if (!articleLinks.find((l) => l.href === full)) articleLinks.push({ title, href: full })
      }
    } catch (e) {
      log.errors.push(`Scrape ${pageUrl}: ${String(e)}`)
    }
  }
  log.stages!.articlesFound = articleLinks.length
  log.found = KNOWN_GRANTS.length + articleLinks.length

  // ── 3. DeepSeek-extract each NEW article (skip known before the AI call) ────
  for (const article of articleLinks.slice(0, 10)) {
    if (ctx.isKnown(article.href)) { log.skipped++; continue }

    const text = `${article.title}\nURL: ${article.href}`
    const result = await extractWithDeepSeek("grants", text)
    // DeepSeek returns {skip:true} when the content is not actually a grant.
    if (!result.ok || !result.data || (result.data as { skip?: boolean }).skip === true) { log.skipped++; continue }

    const rawHref = String(result.data.href ?? "")
    const resolvedHref = isRealGrantUrl(rawHref, article.href) ? rawHref : article.href
    items.push({
      id: `foundation-${Buffer.from(article.href).toString("base64").slice(0, 16)}`,
      type: "grants", status: "pending",
      source: "foundation-news", sourceUrl: article.href,
      foundAt: new Date().toISOString(),
      confidence: 0.75, whyMatched: article.title,
      rawText: text,
      extracted: { ...result.data, href: resolvedHref },
    })
  }

  log.stages!.queued = items.length
  log.finishedAt = new Date().toISOString()
  return { log, items }
}
