import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { OSSCard } from "@/components/editorial/oss-card"
import { getOSSRepos } from "@/lib/oss-data"
import { getDepPageCounts } from "@/lib/deps-data"
import { getSimilarRepos } from "@/lib/oss-similar"
import { getEcoTags, ECO_LABEL } from "@/lib/eco-tags"
import { getCompanyForOwner } from "@/lib/company-data"
import { getProgramsForRepo } from "@/lib/grants-data"
import { DepList } from "@/components/editorial/dep-list"
import { CorrectionLink } from "@/components/editorial/correction-link"
import type { OSSPath } from "@/content/oss-paths"

export const dynamicParams = false

interface PageProps {
  params: Promise<{ owner: string; repo: string }>
}

export async function generateStaticParams(): Promise<{ owner: string; repo: string }[]> {
  return getOSSRepos().map(r => ({ owner: r.owner, repo: r.name }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, repo } = await params
  const r = getOSSRepos().find(r => r.owner === owner && r.name === repo)
  if (!r) return { title: "Not Found" }

  const title = `${repo} — ${owner}`
  const desc  = r.note ?? `Open source Rust repository ${owner}/${repo}.`

  return {
    title,
    description: desc,
    alternates: { canonical: `/oss/${owner}/${repo}` },
    openGraph: {
      title, description: desc, url: `/oss/${owner}/${repo}`, type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image", title, description: desc,
      images: ["/opengraph-image"],
    },
  }
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return n.toLocaleString()
}

function fmtPushedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const SL = {
  label: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.15em",
    color: "var(--e-accent)",
    fontFamily: "var(--e-mono)",
    marginBottom: 12,
  },
  section: { marginBottom: 40 },
}

export default async function OSSRepoPage({ params }: PageProps) {
  const { owner, repo: repoName } = await params
  const allRepos = getOSSRepos()
  const r = allRepos.find(r => r.owner === owner && r.name === repoName)
  if (!r) notFound()

  const depPageCounts  = getDepPageCounts()
  const stars          = r.stars           ?? 0
  const forks          = r.forks           ?? 0
  const openIssues     = r.openIssuesCount ?? 0
  const tier           = r.activityTier    ?? "dormant"
  const licenseLabel   = !r.license                    ? "Unknown"
                       : r.license === "NOASSERTION"   ? "Not identified"
                       : r.license
  const ecoTags        = getEcoTags(r.dependencies, { owner: r.owner ?? undefined, name: r.name ?? undefined, topics: r.topics ?? undefined })
  const company        = r.owner ? getCompanyForOwner(r.owner) : undefined
  const slug           = `${owner}/${repoName}`
  const fundingForRepo = getProgramsForRepo(slug)
  const slugIndex      = Object.fromEntries(allRepos.map(r => [`${r.owner}/${r.name}`, r]))
  const similarRepos   = getSimilarRepos(slug).slice(0, 10)
    .map(e => slugIndex[e.repo])
    .filter((r): r is OSSPath => r != null)

  const sortedDeps = (r.dependencies ?? [])
    .filter(d => d in depPageCounts)
    .sort((a, b) => (depPageCounts[b] ?? 0) - (depPageCounts[a] ?? 0))

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 28 }}>
            <Link href="/oss" className="e-repo-breadcrumb">← Repositories</Link>
          </nav>

          {/* Header */}
          <header style={{ marginBottom: 36 }}>
            <div className="e-repo-owner">{owner}</div>
            <h1 className="e-repo-title">{repoName}</h1>
            {r.note && <p className="e-repo-desc">{r.note}</p>}
          </header>

          {/* Stats bar */}
          <div className="e-repo-stats-bar">
            <div className="e-repo-stats">
              {([
                ["★", fmt(stars),     "Stars"],
                ["⑂", fmt(forks),     "Forks"],
                ["◎", fmt(openIssues),"Issues"],
              ] as const).map(([icon, value, label]) => (
                <div key={label} className="e-repo-stat-pill">
                  <div className="e-repo-stat-pill__value">{icon} {value}</div>
                  <div className="e-repo-stat-pill__label">{label}</div>
                </div>
              ))}
              <div className="e-repo-stat-pill">
                <div className="e-repo-stat-pill__value e-repo-stat-pill__value--mono">{licenseLabel}</div>
                <div className="e-repo-stat-pill__label">License</div>
              </div>
            </div>
            <div className="e-repo-stats-right">
              <span className={`e-oss__activity e-oss__activity--${tier}`}>{tier}</span>
              <a href={r.href} target="_blank" rel="noopener noreferrer" className="e-repo-gh-link">
                View on GitHub →
              </a>
            </div>
          </div>

          {/* Last commit */}
          {r.pushedAt && (
            <div style={{ marginBottom: 36 }}>
              <span className="e-repo-last-commit">
                Last GitHub commit: {fmtPushedAt(r.pushedAt)}
              </span>
            </div>
          )}

          {/* Ecosystem */}
          {ecoTags.length > 0 && (
            <div style={SL.section}>
              <div style={SL.label}>Ecosystem</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ecoTags.map(tag => (
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

          {/* Maintained by */}
          {company && (
            <div style={SL.section}>
              <div style={SL.label}>Maintained by</div>
              <Link href={`/ecosystem/${company.slug}`} className="e-repo-company-row">
                <span className="e-repo-company-row__name">{company.name}</span>
                <span className="e-repo-company-row__sector">{company.sector}</span>
                <span className="e-repo-company-row__arrow">→</span>
              </Link>
            </div>
          )}

          {/* Funded by */}
          {fundingForRepo.length > 0 && (
            <div style={SL.section}>
              <div style={SL.label}>Funded by</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {fundingForRepo.map(({ program: p, funder: f }) => (
                  <div key={p.slug} className="e-repo-funding-row">
                    <div className="e-repo-funding-row__main">
                      <Link href={`/grants/${p.slug}`} className="e-repo-funding-row__name">{p.name}</Link>
                      {f && (
                        <span className="e-repo-funding-row__via">
                          {"via "}
                          <Link href={`/funders/${f.slug}`} className="e-repo-funding-row__funder">{f.name}</Link>
                        </span>
                      )}
                    </div>
                    <span className="e-repo-funding-row__status">{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contribution */}
          {openIssues > 0 && (
            <div style={SL.section}>
              <div style={SL.label}>Contribution</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <a
                  href={`${r.href}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`e-repo-issues-link${tier === "active" ? " e-repo-issues-link--active" : ""}`}
                >
                  {openIssues} open issue{openIssues !== 1 ? "s" : ""} →
                </a>
                {tier === "active" && (
                  <span className="e-repo-active-note">active project</span>
                )}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {sortedDeps.length > 0 && (
            <div style={SL.section}>
              <div style={SL.label}>Dependencies ({sortedDeps.length} total)</div>
              <DepList deps={sortedDeps} />
            </div>
          )}

          {/* Similar repos */}
          {similarRepos.length > 0 && (
            <div style={SL.section}>
              <div style={SL.label}>Similar repositories</div>
              <div className="e-oss-grid">
                {similarRepos.map(repo => (
                  <OSSCard key={repo.href} repo={repo} depPageCounts={depPageCounts} />
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="e-repo-footer">
            <Link href="/oss" className="e-repo-breadcrumb">← Browse all repos</Link>
            <CorrectionLink />
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
