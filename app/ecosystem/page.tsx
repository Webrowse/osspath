import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { EcosystemArchive } from "@/components/editorial/ecosystem-archive"
import { COMPANIES } from "@/content/companies"
import { getOwnerCompanyIndex } from "@/lib/company-data"

export const metadata: Metadata = {
  title: "Companies Using Rust in Production",
  description: "Ecosystem orientation — who builds what with Rust. Tokio, Cloudflare, Microsoft, Mozilla, and more. Not all companies listed are actively hiring.",
  alternates: { canonical: "/ecosystem" },
  openGraph: {
    title: "Companies Using Rust in Production",
    description: "Who builds what with Rust — ecosystem orientation across infrastructure, databases, networking, and tooling.",
    url: "/ecosystem",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Companies Using Rust in Production",
    description: "Who builds what with Rust — ecosystem orientation across infrastructure, databases, and tooling.",
    images: ["/opengraph-image"],
  },
}

export default function EcosystemPage() {
  const ownerIndex = getOwnerCompanyIndex()
  const companies = COMPANIES.map((c) => ({
    ...c,
    hasRepos: c.github_org ? ownerIndex.has(c.github_org.toLowerCase()) : false,
  }))

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col e-col--wide">
          <EcosystemArchive companies={companies} />
        </div>
      </section>
    </EditorialLayout>
  )
}
