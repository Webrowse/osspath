import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { PortalsArchive } from "@/components/editorial/portals-archive"
import { PORTALS } from "@/content/portals"

export const metadata: Metadata = {
  title: "Rust Job Portals & Boards",
  description: "Rust-relevant job boards and aggregators — LinkedIn, Indeed, We Work Remotely, Arc.dev, and more. Complementary sources to search alongside this site.",
  alternates: { canonical: "/portals" },
  openGraph: {
    title: "Rust Job Portals & Boards",
    description: "Rust-filtered pages on major job boards — LinkedIn, Indeed, We Work Remotely, Arc.dev, and more.",
    url: "/portals",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rust Job Portals & Boards",
    description: "Rust-filtered pages on major job boards and remote-work platforms.",
    images: ["/opengraph-image"],
  },
}

export default function PortalsArchivePage() {
  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <PortalsArchive portals={PORTALS} />
        </div>
      </section>
    </EditorialLayout>
  )
}
