import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { GrantsArchive } from "@/components/editorial/grants-archive"
import { GRANTS } from "@/content/grants"
import { filterActive } from "@/lib/content-utils"

export const metadata: Metadata = {
  title: "Rust Funding",
  description: "Funding opportunities for Rust ecosystem work — Rust Foundation grants, fellowships, NLnet programs, government investment, and more.",
  alternates: { canonical: "/grants" },
  openGraph: {
    title: "Rust Funding",
    description: "Rust Foundation grants, NLnet, Sovereign Tech Fund, OpenSSF, and more — curated funding for Rust ecosystem work.",
    url: "/grants",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rust Funding",
    description: "Funding opportunities for Rust ecosystem work — grants, fellowships, and more.",
    images: ["/opengraph-image"],
  },
}

export default function GrantsArchivePage() {
  const active = filterActive(GRANTS)

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <GrantsArchive programs={active} />
        </div>
      </section>
    </EditorialLayout>
  )
}
