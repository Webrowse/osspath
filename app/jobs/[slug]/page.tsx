import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { GrantCard } from "@/components/editorial/grant-card"
import { OSSCard } from "@/components/editorial/oss-card"
import { JOBS } from "@/content/jobs"
import { getJobBySlug } from "@/lib/jobs-data"
import { getCompanyBySlug, buildCompanyProfile } from "@/lib/company-data"
import { getProgramsForEcosystem } from "@/lib/grants-data"
import { getDepPageCounts } from "@/lib/deps-data"
import { ECO_LABEL } from "@/lib/eco-tags"
import type { EcoTag } from "@/lib/eco-tags"
import type { FundingProgram } from "@/content/grants"
import { formatCheckedAt } from "@/lib/content-utils"
import { CorrectionLink } from "@/components/editorial/correction-link"

export const dynamicParams = false

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams(): { slug: string }[] {
  return JOBS.map(j => ({ slug: j.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const job = getJobBySlug(slug)
  if (!job) return { title: "Not Found" }

  const title = `${job.role} at ${job.company}`
  const description = job.note

  return {
    title,
    description,
    alternates: { canonical: `/jobs/${slug}` },
    openGraph: {
      title,
      description,
      url: `/jobs/${slug}`,
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

function dedupPrograms(programs: FundingProgram[]): FundingProgram[] {
  const seen = new Set<string>()
  return programs.filter(p => {
    if (seen.has(p.slug)) return false
    seen.add(p.slug)
    return true
  })
}

export default async function JobDetailPage({ params }: PageProps) {
  const { slug } = await params
  const job      = getJobBySlug(slug)
  if (!job) notFound()

  const company = getCompanyBySlug(job.company_slug)
  const profile = company ? buildCompanyProfile(company) : null
  const orgTopRepos = profile?.repos.slice(0, 4) ?? []
  const depCounts = getDepPageCounts()

  // Collect funding programs from all job ecosystems, deduplicate, cap at 4
  const relatedPrograms = dedupPrograms(
    (job.ecosystems ?? []).flatMap(eco => getProgramsForEcosystem(eco as EcoTag))
  ).slice(0, 4)

  const isRemote  = job.remoteConfirmed || job.tags.some(t => t.toLowerCase() === "remote")
  const locations = job.tags.filter(t => !["remote", "full-time", "full time", "onsite"].includes(t.toLowerCase()))

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 24, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/jobs" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              ← Jobs
            </Link>
            {company && (
              <Link href={`/ecosystem/${company.slug}`} style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
                {company.name}
              </Link>
            )}
          </nav>

          {/* Header */}
          <header style={{ marginBottom: 32 }}>
            <div className="e-section__num">{job.company}</div>
            <h1
              className="e-section__title"
              style={{ fontSize: "clamp(20px, 2.8vw, 30px)", fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              {job.role}
            </h1>
            <p className="e-archive-meta" style={{ marginTop: 12, maxWidth: 640 }}>
              {job.note}
            </p>
          </header>

          {/* Tags strip */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 32,
              paddingBottom: 24,
              borderBottom: "1px solid var(--e-line-soft)",
            }}
          >
            {isRemote && (
              <span className="e-tag e-tag--accent">Remote</span>
            )}
            {locations.slice(0, 3).map(t => (
              <span key={t} className="e-tag">{t}</span>
            ))}
            {job.rustMentioned && (
              <span className="e-tag e-tag--soft" style={{ fontFamily: "var(--e-mono)", fontSize: 12 }}>Rust mentioned</span>
            )}
          </div>

          {/* Ecosystems */}
          {job.ecosystems && job.ecosystems.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 12 }}>
                Ecosystems
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {job.ecosystems.map(tag => (
                  <Link
                    key={tag}
                    href={`/ecosystems/${tag}`}
                    className={`e-oss__eco-badge e-oss__eco-badge--${tag} e-oss__eco-badge--lg`}
                    style={{ textDecoration: "none" }}
                  >
                    {ECO_LABEL[tag]}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Company card */}
          {company && (
            <div
              style={{
                marginBottom: 40,
                padding: "16px 20px",
                border: "1px solid var(--e-line-soft)",
                borderRadius: 6,
              }}
            >
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 8 }}>
                Company
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--e-fg)", fontFamily: "var(--e-mono)", marginBottom: 4 }}>
                    {company.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--e-fg-dim)", marginBottom: 8 }}>
                    {company.sector}
                  </div>
                  {company.description && (
                    <p style={{ fontSize: 13, color: "var(--e-fg-dim)", margin: 0, lineHeight: 1.5, maxWidth: 520 }}>
                      {company.description}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <Link
                    href={`/ecosystem/${company.slug}`}
                    style={{ fontSize: 13, color: "var(--e-accent)", textDecoration: "none", fontFamily: "var(--e-mono)", whiteSpace: "nowrap" }}
                  >
                    Company profile →
                  </Link>
                  <a
                    href={company.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    Website →
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Apply CTA */}
          <div style={{ marginBottom: 48 }}>
            <a
              href={job.href}
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
              Apply at {job.company} →
            </a>
            <p style={{ fontSize: 12, color: "var(--e-fg-faint)", marginTop: 8 }}>
              {formatCheckedAt(job.checkedAt) ?? `Last reviewed ${job.checkedAt}`}
            </p>
          </div>

          {/* Org repositories */}
          {orgTopRepos.length > 0 && company && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 6 }}>
                {company.name} open source
              </div>
              <p style={{ fontSize: 13, color: "var(--e-fg-dim)", marginBottom: 16, lineHeight: 1.5 }}>
                Repositories maintained by the team behind this role.
              </p>
              <div className="e-oss-grid">
                {orgTopRepos.map(repo => (
                  <OSSCard key={repo.href} repo={repo} depPageCounts={depCounts} />
                ))}
              </div>
              {(profile?.repoCount ?? 0) > 4 && (
                <div style={{ marginTop: 12 }}>
                  <Link
                    href={`/ecosystem/${company.slug}`}
                    style={{ fontSize: 13, color: "var(--e-accent)", textDecoration: "none", fontFamily: "var(--e-mono)" }}
                  >
                    View all {profile?.repoCount} repositories →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Related funding programs */}
          {relatedPrograms.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 6 }}>
                Funding available in these ecosystems
              </div>
              <p style={{ fontSize: 13, color: "var(--e-fg-dim)", marginBottom: 16, lineHeight: 1.5 }}>
                Programs that fund open source work in the same ecosystems as this role.
              </p>
              <div className="e-grants">
                {relatedPrograms.map(program => (
                  <GrantCard key={program.slug} program={program} />
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <Link href="/grants" style={{ fontSize: 13, color: "var(--e-accent)", textDecoration: "none", fontFamily: "var(--e-mono)" }}>
                  Browse all funding programs →
                </Link>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ paddingTop: 24, borderTop: "1px solid var(--e-line-soft)", display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <Link href="/jobs" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              ← All jobs
            </Link>
            <CorrectionLink />
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
