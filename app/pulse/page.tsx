import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { PulseArchive } from "@/components/editorial/pulse-archive"
import { PULSE } from "@/content/pulse"

export const metadata: Metadata = {
  title: "Rust Community — Newsletters, Forums & Podcasts",
  description: "The important Rust community spaces — This Week in Rust, the Rust Users Forum, community newsletters, podcasts, and working-group channels.",
  alternates: { canonical: "/pulse" },
  openGraph: {
    title: "Rust Community — Newsletters, Forums & Podcasts",
    description: "Curated Rust community spaces — newsletters, forums, podcasts, and working-group channels worth following.",
    url: "/pulse",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rust Community — Newsletters, Forums & Podcasts",
    description: "Rust newsletters, forums, podcasts, and community channels — curated.",
    images: ["/opengraph-image"],
  },
}

export default function PulseArchivePage() {
  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <PulseArchive items={PULSE} />
        </div>
      </section>
    </EditorialLayout>
  )
}
