import { Suspense } from "react"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { NewsRow } from "@/components/editorial/news-item"
import { ArchiveSearch } from "@/components/editorial/archive-search"
import { NEWS } from "@/content/news"
import type { NewsItem } from "@/content/news"
import { matchesQuery } from "@/lib/content-utils"

export const metadata: Metadata = {
  title: "Rust Pulse — What's Happening in Rust",
  description: "The signal, not the feed: releases and announcements, project movement, and community writing worth your time — hand-checked and linked to the source.",
  alternates: { canonical: "/news" },
  openGraph: {
    title: "Rust Pulse — What's Happening in Rust",
    description: "Releases, project movement, and community writing worth your time — hand-checked, linked to the source.",
    url: "/news",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rust Pulse — What's Happening in Rust",
    description: "The signal, not the feed — what's happening in Rust right now.",
    images: ["/opengraph-image"],
  },
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

// ── Presentation-side grouping ─────────────────────────────────────────────
// The feed data carries no useful category (every item is kind:"Blog"), so we
// classify by title for display only. Deterministic, no content rewriting.

type PulseGroup = "signals" | "movement" | "writing"

const SIGNAL_RE   = /\b(releas|announc|welcom|stabiliz|rfc\b|roadmap|foundation|survey|security|cve|edition|deprecat)/i
const MOVEMENT_RE = /\b(v?\d+\.\d+(\.\d+)?|update|now (supports?|available)|introducing|migrat|rewrit|port(ing|ed)?\b)/i

function classify(item: NewsItem): PulseGroup {
  if (SIGNAL_RE.test(item.title))   return "signals"
  if (MOVEMENT_RE.test(item.title)) return "movement"
  return "writing"
}

const GROUP_META: Record<PulseGroup, { title: string; desc: string; label: string }> = {
  signals:  { title: "Recent signals",    desc: "Releases, official announcements, ecosystem changes", label: "Signal" },
  movement: { title: "Project movement",  desc: "Version bumps, migrations, and projects picking up speed", label: "Movement" },
  writing:  { title: "Community writing", desc: "Articles, deep dives, and discussions worth your time", label: "Writing" },
}

const GROUP_ORDER: PulseGroup[] = ["signals", "movement", "writing"]

export default async function NewsArchivePage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams

  const sorted = [...NEWS].sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date)
    return 0
  })

  const items = q ? sorted.filter((n) => matchesQuery(n as Record<string, unknown>, q)) : sorted

  const grouped = GROUP_ORDER.map(g => ({
    group: g,
    meta:  GROUP_META[g],
    items: items.filter(n => classify(n) === g),
  })).filter(g => g.items.length > 0)

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <div className="e-archive-header">
            <div>
              <div className="e-section__num">Explore · Stay updated</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Rust Pulse</h1>
              <p className="e-archive-meta">
                What&apos;s happening in Rust — the signal, not the feed. Hand-checked,
                grouped by what it means, linked straight to the source.
              </p>
            </div>
            <Suspense>
              <ArchiveSearch placeholder="Filter by title or source…" defaultValue={q} />
            </Suspense>
          </div>

          <div style={{ marginTop: 8, marginBottom: 24 }}>
            <span className="e-section__meta">
              {items.length} {items.length === 1 ? "item" : "items"}
              {q && ` matching "${q}"`}
            </span>
          </div>

          {items.length === 0 && <p className="e-archive-empty">No items match that filter.</p>}

          {q ? (
            /* Filtered view: flat list, grouping would fight the search */
            <div className="e-news">
              {items.map((item, i) => (
                <NewsRow key={item.href + i} item={item} label={GROUP_META[classify(item)].label} />
              ))}
            </div>
          ) : (
            grouped.map(({ group, meta, items: groupItems }) => (
              <section key={group} className="pulse-section">
                <div className="pulse-section__head">
                  <h2 className="pulse-section__title">{meta.title}</h2>
                  <span className="pulse-section__desc">{meta.desc}</span>
                </div>
                <div className="e-news">
                  {groupItems.map((item, i) => (
                    <NewsRow key={item.href + i} item={item} label={meta.label} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </section>
    </EditorialLayout>
  )
}
