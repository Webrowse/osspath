import { Suspense } from "react"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { NewsRow } from "@/components/editorial/news-item"
import { ArchiveSearch } from "@/components/editorial/archive-search"
import { NEWS } from "@/content/news"
import { matchesQuery } from "@/lib/content-utils"

export const metadata: Metadata = {
  title: "Rust Ecosystem News",
  description: "Release announcements, blog posts, tutorials, and community discussions from the Rust ecosystem — curated from TWIR, r/rust, and the official blog.",
  alternates: { canonical: "/news" },
  openGraph: {
    title: "Rust Ecosystem News",
    description: "Releases, blog posts, and community discussions from the Rust ecosystem.",
    url: "/news",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rust Ecosystem News",
    description: "Rust releases, blog posts, tutorials, and community discussions — curated.",
    images: ["/opengraph-image"],
  },
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function NewsArchivePage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams

  const sorted = [...NEWS].sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date)
    return 0
  })

  const items = q ? sorted.filter((n) => matchesQuery(n as Record<string, unknown>, q)) : sorted

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <div className="e-archive-header">
            <div>
              <div className="e-section__num">Ecosystem</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>News</h1>
              <p className="e-archive-meta">
                Release announcements, blog posts, tutorials, and community discussions.
              </p>
            </div>
            <Suspense>
              <ArchiveSearch placeholder="Filter by title, kind, or source…" defaultValue={q} />
            </Suspense>
          </div>

          <div style={{ marginTop: 8, marginBottom: 24 }}>
            <span className="e-section__meta">
              {items.length} {items.length === 1 ? "item" : "items"}
              {q && ` matching "${q}"`}
            </span>
          </div>

          {items.length > 0 ? (
            <div className="e-news">
              {items.map((item, i) => (
                <NewsRow key={item.href + i} item={item} />
              ))}
            </div>
          ) : (
            <p className="e-archive-empty">No items match that filter.</p>
          )}
        </div>
      </section>
    </EditorialLayout>
  )
}
