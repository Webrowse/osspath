import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { GrantCard } from "@/components/editorial/grant-card"
import { FUNDERS } from "@/content/funders"
import { getProgramsByFunder } from "@/lib/grants-data"
import { ECO_LABEL } from "@/lib/eco-tags"

export const dynamicParams = false

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams(): { slug: string }[] {
  return FUNDERS.map(f => ({ slug: f.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const funder = FUNDERS.find(f => f.slug === slug)
  if (!funder) return { title: "Not Found" }

  const title = `${funder.name} — Rust Funding`
  const description = funder.description

  return {
    title,
    description,
    alternates: { canonical: `https://jobs.adarshrust.com/funders/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://jobs.adarshrust.com/funders/${slug}`,
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
  foundation: "Foundation",
  company:    "Company",
  protocol:   "Protocol",
  government: "Government Program",
  platform:   "Platform",
  collective: "Collective",
}

export default async function FunderDetailPage({ params }: PageProps) {
  const { slug }  = await params
  const funder    = FUNDERS.find(f => f.slug === slug)
  if (!funder) notFound()

  const programs = getProgramsByFunder(funder.slug)

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 24, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/funders" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              ← Funders
            </Link>
            <Link href="/grants" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              All Programs
            </Link>
          </nav>

          {/* Header */}
          <header style={{ marginBottom: 32 }}>
            <div className="e-section__num">{KIND_LABEL[funder.kind] ?? funder.kind}</div>
            <h1
              className="e-section__title"
              style={{ fontSize: "clamp(26px, 3.4vw, 36px)", fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              {funder.name}
            </h1>
            <p className="e-archive-meta" style={{ marginTop: 8, maxWidth: 640 }}>
              {funder.description}
            </p>
          </header>

          {/* Stats */}
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
              <div style={{ fontSize: 22, fontWeight: 600, color: "var(--e-fg)", lineHeight: 1.1 }}>
                {programs.length}
              </div>
              <div style={{ fontSize: 11, color: "var(--e-fg-dim)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Programs
              </div>
            </div>
            {funder.hq_country && (
              <div style={{ minWidth: 80 }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: "var(--e-fg)", lineHeight: 1.1, fontFamily: "var(--e-mono)" }}>
                  {funder.hq_country}
                </div>
                <div style={{ fontSize: 11, color: "var(--e-fg-dim)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  HQ
                </div>
              </div>
            )}
          </div>

          {/* Links */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
            <a href={funder.href} target="_blank" rel="noopener noreferrer" className="e-ext-link">
              Website →
            </a>
            {funder.github_org && (
              <a
                href={`https://github.com/${funder.github_org}`}
                target="_blank"
                rel="noopener noreferrer"
                className="e-ext-link"
              >
                GitHub →
              </a>
            )}
            {funder.company_slug && (
              <Link href={`/ecosystem/${funder.company_slug}`} className="e-ext-link">
                Company profile →
              </Link>
            )}
          </div>

          {/* Ecosystems */}
          {funder.ecosystems && funder.ecosystems.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 12 }}>
                Ecosystems Funded
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {funder.ecosystems.map(tag => (
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

          {/* Programs */}
          {programs.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 16 }}>
                {programs.length} {programs.length === 1 ? "program" : "programs"}
              </div>
              <div className="e-grants">
                {programs.map(program => (
                  <GrantCard key={program.slug} program={program} />
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ paddingTop: 24, borderTop: "1px solid var(--e-line-soft)" }}>
            <Link href="/funders" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              ← All funders
            </Link>
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
