import type { Metadata } from "next"
import Link from "next/link"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { getPathCardStats } from "@/lib/career-paths"
import { getGraphStats } from "@/lib/landing-data"

export const metadata: Metadata = {
  title: "Rust Career Paths — Evidence-Based Routes to a Rust Job",
  description:
    "Pick a destination — Backend, Systems, Infrastructure, or Embedded Rust Engineer — and follow a route built from thousands of production Rust repositories: skills, evidence, repos to study, and projects to build.",
  alternates: { canonical: "/paths" },
  openGraph: {
    title: "Rust Career Paths — Evidence-Based Routes to a Rust Job",
    description:
      "Skills, evidence, repos to study, and projects to build — routes computed from production Rust codebases.",
    url: "/paths",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
}

export default function PathsIndexPage() {
  const cards = getPathCardStats()
  const stats = getGraphStats()

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col e-col--wide">

          <header style={{ marginBottom: 40 }}>
            <div className="e-section__num">Destinations</div>
            <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 36px)" }}>
              Where do you want to end up?
            </h1>
            <p className="e-archive-meta" style={{ marginTop: 10, maxWidth: "62ch" }}>
              Each destination is a fixed set of capabilities — and for every capability,
              several routes through the {stats.totalRepos.toLocaleString("en-US")} production
              Rust repositories indexed here. The skills are non-negotiable; the repos that
              teach them are your choice.
            </p>
          </header>

          <div className="path-cards">
            {cards.map(c => (
              <Link key={c.slug} href={`/paths/${c.slug}`} className="path-card">
                <span className="path-card__eyebrow">I want to become a…</span>
                <span className="path-card__title">{c.shortTitle}</span>
                <p className="path-card__tagline">{c.tagline}</p>
                <span className="path-card__stats">
                  <b>{c.evidenceRepos.toLocaleString("en-US")}</b> repos of evidence
                  <span className="path-card__dot">·</span>
                  <b>{c.capabilityCount}</b> capabilities
                  {c.openJobs > 0 && (
                    <>
                      <span className="path-card__dot">·</span>
                      <b>{c.openJobs}</b> open role{c.openJobs !== 1 ? "s" : ""}
                    </>
                  )}
                </span>
                <span className="e-btn e-btn--sm path-card__go" style={{ alignSelf: "flex-start", marginTop: 8 }}>
                  Start the route →
                </span>
              </Link>
            ))}
          </div>

          <p style={{ marginTop: 36, fontSize: 12, color: "var(--e-fg-dim)", maxWidth: "62ch", lineHeight: 1.6 }}>
            No accounts, no courses, no certificates. Your progress is a self-assessed checklist
            saved in your browser; the evidence is real code you can read today.
          </p>

        </div>
      </section>
    </EditorialLayout>
  )
}
