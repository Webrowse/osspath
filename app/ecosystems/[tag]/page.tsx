import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { OSSCard } from "@/components/editorial/oss-card"
import { JobCard } from "@/components/editorial/job-card"
import { GrantCard } from "@/components/editorial/grant-card"
import { ECO_TAG_ORDER, ECO_DISPLAY_NAME, ECO_LABEL, isEcoTag } from "@/lib/eco-tags"
import { getReposByEco, getOrgsByEco, getActiveJobsForEcosystem, getProgramsForEcosystem } from "@/lib/ecosystem-data"
import { getDepPageCounts } from "@/lib/deps-data"
import { getActiveJobsByCompany } from "@/lib/jobs-data"

export const dynamicParams = false

interface PageProps {
  params: Promise<{ tag: string }>
}

export function generateStaticParams(): { tag: string }[] {
  return ECO_TAG_ORDER.map(tag => ({ tag }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params
  if (!isEcoTag(tag)) return { title: "Not Found" }

  const label = ECO_DISPLAY_NAME[tag]
  const title = `${label} — Rust Ecosystem`
  const description = `Open source Rust repositories, hiring organizations, and funding programs in the ${label} ecosystem.`

  return {
    title,
    description,
    alternates: { canonical: `https://jobs.adarshrust.com/ecosystems/${tag}` },
    openGraph: {
      title,
      description,
      url: `https://jobs.adarshrust.com/ecosystems/${tag}`,
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

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return n.toLocaleString()
}

export default async function EcosystemHubPage({ params }: PageProps) {
  const { tag } = await params
  if (!isEcoTag(tag)) notFound()

  const label        = ECO_DISPLAY_NAME[tag]
  const shortLabel   = ECO_LABEL[tag]
  const depCounts    = getDepPageCounts()

  const allRepos     = getReposByEco(tag)
  const topRepos     = allRepos.slice(0, 6)
  const activeJobs   = getActiveJobsForEcosystem(tag)
  const programs     = getProgramsForEcosystem(tag).filter(p => p.status === "rolling" || p.status === "open").slice(0, 4)
  const orgs         = getOrgsByEco(tag)

  // Orgs that are currently hiring in this ecosystem
  const hiringOrgSlugs = new Set(activeJobs.map(j => j.company_slug))
  const hiringOrgs     = orgs.filter(c => hiringOrgSlugs.has(c.slug))

  // Show active jobs, capped at 4
  const featuredJobs = activeJobs.slice(0, 4)

  const totalStars = allRepos.reduce((s, r) => s + (r.stars ?? 0), 0)
  const activeCount = allRepos.filter(r => r.activityTier === "active").length

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 24, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/ecosystems" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              ← Ecosystems
            </Link>
            <Link href="/oss" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              Repositories
            </Link>
          </nav>

          {/* Header */}
          <header style={{ marginBottom: 32 }}>
            <div className="e-section__num">
              <span className={`e-oss__eco-badge e-oss__eco-badge--${tag}`}>{shortLabel}</span>
            </div>
            <h1
              className="e-section__title"
              style={{ fontSize: "clamp(26px, 3.4vw, 36px)", fontFamily: "var(--font-ibm-plex-mono)", marginTop: 12 }}
            >
              {label}
            </h1>
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
            {(
              [
                ["Repositories",  fmt(allRepos.length)],
                ["Total stars",   fmt(totalStars)],
                ["Active repos",  fmt(activeCount)],
                ["Open roles",    String(activeJobs.length)],
                ["Funding programs", String(programs.length)],
              ] as const
            ).map(([lbl, val]) => (
              <div key={lbl} style={{ minWidth: 80 }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: "var(--e-fg)", lineHeight: 1.1 }}>
                  {val}
                </div>
                <div style={{ fontSize: 11, color: "var(--e-fg-dim)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {lbl}
                </div>
              </div>
            ))}
          </div>

          {/* Top repositories */}
          {topRepos.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 16 }}>
                {allRepos.length <= 6
                  ? `${allRepos.length} repositories`
                  : `Top repositories · ranked by stars`}
              </div>
              <div className="e-oss-grid">
                {topRepos.map(repo => (
                  <OSSCard key={repo.href} repo={repo} depPageCounts={depCounts} />
                ))}
              </div>
              {allRepos.length > 6 && (
                <div style={{ marginTop: 16 }}>
                  <Link
                    href={`/oss?eco=${tag}`}
                    style={{ fontSize: 13, color: "var(--e-accent)", textDecoration: "none", fontFamily: "var(--e-mono)" }}
                  >
                    Browse all {fmt(allRepos.length)} repositories →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Open positions */}
          {featuredJobs.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 16 }}>
                {activeJobs.length <= 4
                  ? `${activeJobs.length} open position${activeJobs.length !== 1 ? "s" : ""}`
                  : `Open positions`}
              </div>
              <div className="e-jobs">
                {featuredJobs.map(job => (
                  <JobCard key={job.slug} job={job} />
                ))}
              </div>
              {activeJobs.length > 4 && (
                <div style={{ marginTop: 12 }}>
                  <Link
                    href={`/jobs?eco=${tag}`}
                    style={{ fontSize: 13, color: "var(--e-accent)", textDecoration: "none", fontFamily: "var(--e-mono)" }}
                  >
                    Browse all {activeJobs.length} positions →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Hiring organizations */}
          {hiringOrgs.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 16 }}>
                Hiring now in {label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {hiringOrgs.map(org => {
                  const jobCount = getActiveJobsByCompany(org.slug).length
                  return (
                    <Link
                      key={org.slug}
                      href={`/ecosystem/${org.slug}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        border: "1px solid var(--e-line-soft)",
                        borderRadius: 5,
                        textDecoration: "none",
                        color: "var(--e-fg)",
                      }}
                    >
                      <div>
                        <span style={{ fontFamily: "var(--e-mono)", fontSize: 14, fontWeight: 500 }}>{org.name}</span>
                        {org.description && (
                          <span style={{ fontSize: 12, color: "var(--e-fg-dim)", marginLeft: 10 }}>{org.sector}</span>
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: "var(--e-accent)", fontFamily: "var(--e-mono)", whiteSpace: "nowrap" }}>
                        {jobCount} open role{jobCount !== 1 ? "s" : ""} →
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Funding programs */}
          {programs.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 16 }}>
                Funding programs
              </div>
              <div className="e-grants">
                {programs.map(program => (
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

          {/* All orgs in this ecosystem */}
          {orgs.length > hiringOrgs.length && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 16 }}>
                {orgs.length} organizations in {label}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {orgs.map(org => (
                  <Link
                    key={org.slug}
                    href={`/ecosystem/${org.slug}`}
                    style={{ textDecoration: "none" }}
                  >
                    <span className="e-tag e-tag--soft" style={{ cursor: "pointer", fontFamily: "var(--e-mono)", fontSize: 12 }}>
                      {org.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ paddingTop: 24, borderTop: "1px solid var(--e-line-soft)", display: "flex", gap: 24, flexWrap: "wrap" }}>
            <Link href={`/oss?eco=${tag}`} style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              All repositories →
            </Link>
            <Link href={`/jobs?eco=${tag}`} style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              All jobs →
            </Link>
            <Link href="/oss" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              ← Repositories
            </Link>
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
