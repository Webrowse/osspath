import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { OSSCard } from "@/components/editorial/oss-card"
import { GrantCard } from "@/components/editorial/grant-card"
import { JobCard } from "@/components/editorial/job-card"
import { COMPANIES } from "@/content/companies"
import { buildCompanyProfile, getCompanyBySlug } from "@/lib/company-data"
import { getDepPageCounts } from "@/lib/deps-data"
import { getProgramsForCompany, getFunderForCompany, getIncomingFundingForOrg } from "@/lib/grants-data"
import { getActiveJobsByCompany } from "@/lib/jobs-data"
import { ECO_LABEL } from "@/lib/eco-tags"
import { CorrectionLink } from "@/components/editorial/correction-link"

export const dynamicParams = false

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams(): { slug: string }[] {
  return COMPANIES.filter(c => typeof c.slug === "string" && c.slug).map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const company = getCompanyBySlug(slug)
  if (!company) return { title: "Not Found" }

  const title = `${company.name} — Rust Repos`
  const description = company.description
    ?? `Open source Rust repositories maintained by ${company.name}.`

  return {
    title,
    description,
    alternates: { canonical: `/ecosystem/${slug}` },
    openGraph: {
      title,
      description,
      url: `/ecosystem/${slug}`,
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

// Parse YYYY-MM-DD without UTC conversion so the month is always correct.
function fmtAcquisitionDate(iso: string): string {
  const [year, month] = iso.split("-").map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export default async function CompanyProfilePage({ params }: PageProps) {
  const { slug } = await params
  const company  = getCompanyBySlug(slug)
  if (!company) notFound()

  const profile           = buildCompanyProfile(company)
  const depCounts         = getDepPageCounts()
  const displayRepos      = profile.repos.slice(0, 24)
  const sponsorFunder     = getFunderForCompany(company.slug)
  const sponsoredPrograms = getProgramsForCompany(company.slug)
  const openJobs          = getActiveJobsByCompany(company.slug)

  // Reverse traversal: programs that fund repos owned by this org.
  // Excludes programs already shown in the sponsoredPrograms section.
  const sponsoredSlugs  = new Set(sponsoredPrograms.map(p => p.slug))
  const incomingFunding = getIncomingFundingForOrg(company.github_org)
    .filter(item => !sponsoredSlugs.has(item.program.slug))

  const hasOSS      = profile.repoCount > 0
  const parentCo    = company.parent_org ? getCompanyBySlug(company.parent_org) : null

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 24, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/ecosystem" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              ← Companies
            </Link>
            <Link href="/oss" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              Repositories
            </Link>
          </nav>

          {/* Header */}
          <header style={{ marginBottom: 32 }}>
            <div className="e-section__num">{company.sector}</div>
            <h1
              className="e-section__title"
              style={{ fontSize: "clamp(26px, 3.4vw, 36px)", fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              {company.name}
            </h1>
            {company.description && (
              <p className="e-archive-meta" style={{ marginTop: 8, maxWidth: 640 }}>
                {company.description}
              </p>
            )}
          </header>

          {/* Acquisition notice */}
          {company.status === "acquired" && company.parent_org && (
            <div
              style={{
                marginBottom: 32,
                padding: "10px 16px",
                border: "1px solid var(--e-line-soft)",
                borderRadius: 6,
                background: "var(--e-bg-2)",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "baseline",
                gap: "4px 20px",
              }}
            >
              <span style={{ fontSize: 12, fontFamily: "var(--e-mono)", color: "var(--e-fg-dim)" }}>
                Acquired by{" "}
                {parentCo ? (
                  <Link
                    href={`/ecosystem/${company.parent_org}`}
                    style={{ color: "var(--e-accent)", textDecoration: "none" }}
                  >
                    {parentCo.name}
                  </Link>
                ) : (
                  company.parent_org
                )}
                {company.effective_date && (
                  <> · {fmtAcquisitionDate(company.effective_date)}</>
                )}
              </span>
              {company.github_org && (
                <span style={{ fontSize: 11, fontFamily: "var(--e-mono)", color: "var(--e-fg-faint)" }}>
                  Repositories continue under github.com/{company.github_org}
                </span>
              )}
            </div>
          )}

          {/* Stats strip */}
          {hasOSS && (
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
                  ["Repositories",   fmt(profile.repoCount)],
                  ["Total stars",    fmt(profile.totalStars)],
                  ["Active repos",    fmt(profile.activityBreakdown.active)],
                  ["Ecosystems",     String(profile.ecosystems.length)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} style={{ minWidth: 80 }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "var(--e-fg)", lineHeight: 1.1 }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--e-fg-dim)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Links */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
            <a
              href={company.href}
              target="_blank"
              rel="noopener noreferrer"
              className="e-ext-link"
            >
              Website →
            </a>
            {company.github_org && (
              <a
                href={`https://github.com/${company.github_org}`}
                target="_blank"
                rel="noopener noreferrer"
                className="e-ext-link"
              >
                GitHub →
              </a>
            )}
          </div>

          {/* Ecosystems */}
          {profile.ecosystems.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 12 }}>
                Ecosystems
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {profile.ecosystems.map(tag => (
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

          {/* Technology signals */}
          {profile.topDeps.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 12 }}>
                Technology signals
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {profile.topDeps.map(dep => (
                  <Link key={dep} href={`/deps/${dep}`} style={{ textDecoration: "none" }}>
                    <span className="e-tag e-tag--soft" style={{ cursor: "pointer", fontFamily: "var(--e-mono)", fontSize: 12 }}>
                      {dep}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Open Positions */}
          {openJobs.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 16 }}>
                Open Positions
              </div>
              <div className="e-jobs">
                {openJobs.map(job => (
                  <JobCard key={job.slug} job={job} />
                ))}
              </div>
            </div>
          )}

          {/* Sponsored programs — company IS the funder */}
          {(sponsorFunder || sponsoredPrograms.length > 0) && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 12 }}>
                Funding Programs
              </div>
              {sponsorFunder && (
                <p style={{ fontSize: 13, color: "var(--e-fg-dim)", marginBottom: 16, lineHeight: 1.5 }}>
                  {company.name} runs funding programs through{" "}
                  <Link href={`/funders/${sponsorFunder.slug}`} style={{ color: "var(--e-accent)", textDecoration: "none" }}>
                    {sponsorFunder.name}
                  </Link>
                  .
                </p>
              )}
              {sponsoredPrograms.length > 0 && (
                <div className="e-grants">
                  {sponsoredPrograms.map(program => (
                    <GrantCard key={program.slug} program={program} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Incoming funding — programs that fund repos owned by this org */}
          {incomingFunding.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 16 }}>
                Recognized by {incomingFunding.length === 1
                  ? "1 funding program"
                  : `${incomingFunding.length} funding programs`}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {incomingFunding.map(({ program: p, funder: f, repos }) => (
                  <div
                    key={p.slug}
                    style={{
                      padding: "12px 16px",
                      border: "1px solid var(--e-line-soft)",
                      borderRadius: 5,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <Link
                          href={`/grants/${p.slug}`}
                          style={{ fontSize: 14, fontWeight: 600, color: "var(--e-fg)", textDecoration: "none", fontFamily: "var(--e-mono)" }}
                        >
                          {p.name}
                        </Link>
                        {f && (
                          <span style={{ fontSize: 12, color: "var(--e-fg-dim)", marginLeft: 8 }}>
                            {"via "}
                            <Link href={`/funders/${f.slug}`} style={{ color: "var(--e-accent)", textDecoration: "none" }}>
                              {f.name}
                            </Link>
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 7px",
                          borderRadius: 3,
                          background: "var(--e-line-soft)",
                          color: "var(--e-fg-dim)",
                          fontFamily: "var(--e-mono)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {repos.map(repo => {
                        const [owner, name] = repo.split("/")
                        return (
                          <Link
                            key={repo}
                            href={`/oss/${owner}/${name}`}
                            style={{ fontSize: 12, fontFamily: "var(--e-mono)", color: "var(--e-accent)", textDecoration: "none" }}
                          >
                            {repo} →
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OSS repositories */}
          {hasOSS ? (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 16 }}>
                {profile.repoCount <= 24
                  ? `${profile.repoCount} ${profile.repoCount === 1 ? "repository" : "repositories"}`
                  : `${24} of ${profile.repoCount} repositories · ranked by stars`}
              </div>
              <div className="e-oss-grid">
                {displayRepos.map(repo => (
                  <OSSCard key={repo.href} repo={repo} depPageCounts={depCounts} />
                ))}
              </div>
              {profile.repoCount > 24 && (
                <div style={{ marginTop: 16 }}>
                  <Link
                    href={`/oss?q=${encodeURIComponent(company.github_org ?? company.name)}`}
                    style={{ fontSize: 13, color: "var(--e-accent)", textDecoration: "none", fontFamily: "var(--e-mono)" }}
                  >
                    Browse all {profile.repoCount} repositories →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 40, padding: "20px 0", borderTop: "1px solid var(--e-line-soft)", borderBottom: "1px solid var(--e-line-soft)" }}>
              <p style={{ fontSize: 14, color: "var(--e-fg-dim)", margin: 0 }}>
                No public repositories indexed for this company yet.
              </p>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--e-line-soft)", display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <Link href="/ecosystem" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              ← Browse all companies
            </Link>
            <CorrectionLink />
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
