import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { PROGRAMS } from "@/content/programs"
import { getFunderBySlug } from "@/lib/grants-data"
import { ECO_LABEL } from "@/lib/eco-tags"

export const dynamicParams = false

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams(): { slug: string }[] {
  return PROGRAMS.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const program = PROGRAMS.find(p => p.slug === slug)
  if (!program) return { title: "Not Found" }

  const title = `${program.name} — Rust Funding`
  const description = program.description

  return {
    title,
    description,
    alternates: { canonical: `https://jobs.adarshrust.com/grants/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://jobs.adarshrust.com/grants/${slug}`,
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  }
}

const KIND_LABEL: Record<string, string> = {
  grant:           "Grant",
  fellowship:      "Fellowship",
  hackathon:       "Hackathon",
  treasury:        "Treasury",
  hardship:        "Hardship",
  "bounty-program":"Bounty Program",
  sponsorship:     "Sponsorship",
}

const STATUS_COLOR: Record<string, string> = {
  open:     "var(--e-accent)",
  rolling:  "var(--e-accent)",
  periodic: "#b08d57",
  closed:   "var(--e-fg-dim)",
  paused:   "var(--e-fg-dim)",
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { slug } = await params
  const program  = PROGRAMS.find(p => p.slug === slug)
  if (!program) notFound()

  const funder = getFunderBySlug(program.funder_slug)

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 24, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/grants" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              ← Funding
            </Link>
            {funder && (
              <Link href={`/funders/${funder.slug}`} style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
                {funder.name}
              </Link>
            )}
          </nav>

          {/* Header */}
          <header style={{ marginBottom: 32 }}>
            <div className="e-section__num">{KIND_LABEL[program.kind] ?? program.kind}</div>
            <h1
              className="e-section__title"
              style={{ fontSize: "clamp(22px, 3vw, 32px)", fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              {program.name}
            </h1>
            <p className="e-archive-meta" style={{ marginTop: 12, maxWidth: 640 }}>
              {program.description}
            </p>
          </header>

          {/* Stats strip */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 32px",
              marginBottom: 40,
              paddingBottom: 24,
              borderBottom: "1px solid var(--e-line-soft)",
            }}
          >
            <div style={{ minWidth: 80 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: STATUS_COLOR[program.status] ?? "var(--e-fg)", lineHeight: 1.1 }}>
                {program.status}
              </div>
              <div style={{ fontSize: 11, color: "var(--e-fg-dim)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Status
              </div>
            </div>

            {program.max_award && (
              <div style={{ minWidth: 80 }}>
                <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "var(--e-mono)", color: "var(--e-fg)", lineHeight: 1.1 }}>
                  {program.max_award}
                </div>
                <div style={{ fontSize: 11, color: "var(--e-fg-dim)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Max Award
                </div>
              </div>
            )}

            {program.rounds_per_year && (
              <div style={{ minWidth: 80 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: "var(--e-fg)", lineHeight: 1.1 }}>
                  {program.rounds_per_year}×
                </div>
                <div style={{ fontSize: 11, color: "var(--e-fg-dim)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Rounds / Year
                </div>
              </div>
            )}

            {program.next_deadline && (
              <div style={{ minWidth: 80 }}>
                <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "var(--e-mono)", color: "var(--e-fg)", lineHeight: 1.1 }}>
                  {program.next_deadline}
                </div>
                <div style={{ fontSize: 11, color: "var(--e-fg-dim)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Next Deadline
                </div>
              </div>
            )}
          </div>

          {/* Eligibility */}
          {program.eligibility && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 8 }}>
                Eligibility
              </div>
              <p style={{ fontSize: 14, color: "var(--e-fg)", lineHeight: 1.6, margin: 0, maxWidth: 600 }}>
                {program.eligibility}
              </p>
            </div>
          )}

          {/* Ecosystems */}
          {program.ecosystems && program.ecosystems.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 12 }}>
                Relevant Ecosystems
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {program.ecosystems.map(tag => (
                  <Link
                    key={tag}
                    href={`/oss?eco=${tag}`}
                    className={`e-oss__eco-badge e-oss__eco-badge--${tag} e-oss__eco-badge--lg`}
                    style={{ textDecoration: "none" }}
                  >
                    {ECO_LABEL[tag]}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Funded repos */}
          {program.funded_repos && program.funded_repos.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 12 }}>
                Funded Repositories
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {program.funded_repos.map(repo => {
                  const [owner, name] = repo.split("/")
                  return (
                    <Link
                      key={repo}
                      href={`/oss/${owner}/${name}`}
                      style={{ fontFamily: "var(--e-mono)", fontSize: 13, color: "var(--e-accent)", textDecoration: "none" }}
                    >
                      {repo} →
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Funder */}
          {funder && (
            <div
              style={{
                marginBottom: 40,
                padding: "16px 20px",
                border: "1px solid var(--e-line-soft)",
                borderRadius: 6,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 4 }}>
                  Funder
                </div>
                <Link
                  href={`/funders/${funder.slug}`}
                  style={{ fontSize: 15, fontWeight: 600, color: "var(--e-fg)", textDecoration: "none" }}
                >
                  {funder.name}
                </Link>
                {funder.hq_country && (
                  <span style={{ fontSize: 12, color: "var(--e-fg-dim)", marginLeft: 8 }}>
                    {funder.hq_country}
                  </span>
                )}
              </div>
              {funder.company_slug && (
                <Link
                  href={`/ecosystem/${funder.company_slug}`}
                  style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}
                >
                  Company profile →
                </Link>
              )}
            </div>
          )}

          {/* Apply CTA */}
          <div style={{ marginBottom: 40 }}>
            <a
              href={program.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                background: "var(--e-accent)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "var(--e-mono)",
                textDecoration: "none",
                borderRadius: 4,
              }}
            >
              Apply / Learn more →
            </a>
            <p style={{ fontSize: 12, color: "var(--e-fg-faint)", marginTop: 8 }}>
              Opens the funder&apos;s official program page. Verify current terms and deadlines there.
            </p>
          </div>

          {/* Footer */}
          <div style={{ paddingTop: 24, borderTop: "1px solid var(--e-line-soft)", display: "flex", gap: 24 }}>
            <Link href="/grants" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              ← All programs
            </Link>
            {funder && (
              <Link href={`/funders/${funder.slug}`} style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
                More from {funder.name} →
              </Link>
            )}
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
