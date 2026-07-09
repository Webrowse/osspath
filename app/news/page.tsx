import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { NewsArchive } from "@/components/editorial/news-archive"
import { NEWS } from "@/content/news"

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

export default function NewsArchivePage() {
  const sorted = [...NEWS].sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date)
    return 0
  })

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <NewsArchive items={sorted} />
        </div>
      </section>
    </EditorialLayout>
  )
}
