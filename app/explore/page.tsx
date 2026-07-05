import type { Metadata } from "next"
import Link from "next/link"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { EXPLORE_GROUPS } from "@/lib/nav-config"

export const metadata: Metadata = {
  title: "Explore — The Rust Ecosystem Library",
  description:
    "New to Rust? The places, people, resources, and signals worth knowing — newsletters, learning resources, maintainers to follow, funding programs, job boards, and events. Curated outbound links; OSSPath maps the ecosystem, it doesn't own it.",
  alternates: { canonical: "/explore" },
  openGraph: {
    title: "Explore — The Rust Ecosystem Library",
    description:
      "The places, people, resources, and signals worth knowing in Rust — curated, with intentional outbound links.",
    url: "/explore",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
}

export default function ExplorePage() {
  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col e-col--wide">

          <header style={{ marginBottom: 40, maxWidth: "62ch" }}>
            <div className="e-section__num">The ecosystem library</div>
            <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 36px)" }}>
              Explore the Rust world
            </h1>
            <p className="e-archive-meta" style={{ marginTop: 10 }}>
              The paths tell you where to go; this is everything worth knowing along the way —
              the places, people, resources, and signals of the Rust ecosystem. Links lead
              outward on purpose: OSSPath maps the territory, it doesn&apos;t fence it.
            </p>
          </header>

          <div className="explore-grid">
            {EXPLORE_GROUPS.map(group => (
              <section key={group.label} className="explore-group">
                <h2 className="explore-group__label">{group.label}</h2>
                <div className="explore-group__items">
                  {group.items.map(item => (
                    <Link key={item.href} href={item.href} className="explore-card">
                      <span className="explore-card__title">{item.label}</span>
                      <span className="explore-card__desc">{item.description}</span>
                      <span className="explore-card__go" aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
