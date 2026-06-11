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
import type { OSSPath } from "@/content/oss-paths"

export const dynamicParams = false

interface PageProps {
  params: Promise<{ owner: string; repo: string }>
}

// ── Static params ──────────────────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ owner: string; repo: string }[]> {
  return getOSSRepos()
    .filter((r): r is OSSPath & { owner: string; name: string } => !!(r.owner && r.name))
    .map(r => ({ owner: r.owner, repo: r.name }))
}

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, repo } = await params
  const r = getOSSRepos().find(r => r.owner === owner && r.name === repo)
  if (!r) return { title: "Not Found" }

  const title = `${repo} — ${owner}`
  const desc  = r.note ?? `Open source Rust repository ${owner}/${repo}.`

  return {
    title,
    description: desc,
    alternates: { canonical: `https://jobs.adarshrust.com/oss/${owner}/${repo}` },
    openGraph: {
      title,
      description: desc,
      url: `https://jobs.adarshrust.com/oss/${owner}/${repo}`,
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: ["/opengraph-image"],
    },
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return n.toLocaleString()
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function OSSRepoPage({ params }: PageProps) {
  const { owner, repo: repoName } = await params
  const allRepos = getOSSRepos()
  const r = allRepos.find(r => r.owner === owner && r.name === repoName)
  if (!r) notFound()

  const depPageCounts = getDepPageCounts()
  const stars         = r.stars           ?? 0
  const forks         = r.forks           ?? 0
  const openIssues    = r.openIssuesCount ?? 0
  const tier          = r.activityTier    ?? "dormant"
  const ecoTags       = getEcoTags(r.dependencies, { owner: r.owner ?? undefined, topics: r.topics ?? undefined })
  const company       = r.owner ? getCompanyForOwner(r.owner) : undefined
  const slug          = `${owner}/${repoName}`

  // Similar repos: look up precomputed similarity, then hydrate from corpus
  const slugIndex     = Object.fromEntries(allRepos.map(r => [`${r.owner}/${r.name}`, r]))
  const similarEntries = getSimilarRepos(slug).slice(0, 10)
  const similarRepos  = similarEntries
    .map(e => slugIndex[e.repo])
    .filter((r): r is OSSPath => r != null)

  // Top dep links — qualified deps sorted by popularity
  const topDeps = (r.dependencies ?? [])
    .filter(d => d in depPageCounts)
    .sort((a, b) => (depPageCounts[b] ?? 0) - (depPageCounts[a] ?? 0))
    .slice(0, 8)

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 24 }}>
            <Link href="/oss" style={{ fontSize: 13, color: "var(--color-muted)", textDecoration: "none" }}>
              ← OSS Paths
            </Link>
          </nav>

          {/* Header */}
          <header style={{ marginBottom: 32 }}>
            <div className="e-section__num">{owner}</div>
            <h1
              className="e-section__title"
              style={{ fontSize: "clamp(26px, 3.4vw, 36px)", fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              {repoName}
            </h1>
            {r.note && (
              <p className="e-archive-meta" style={{ marginTop: 8 }}>{r.note}</p>
            )}
          </header>

          {/* Stats + actions */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 24px",
              alignItems: "flex-start",
              marginBottom: 40,
              paddingBottom: 24,
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div style={{ display: "flex", gap: "8px 24px", flexWrap: "wrap", flex: 1 }}>
              {(
                [
                  ["Stars",  fmt(stars)],
                  ["Forks",  fmt(forks)],
                  ["Issues", fmt(openIssues)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} style={{ minWidth: 60 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "var(--color-foreground)", lineHeight: 1.1 }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {label}
                  </div>
                </div>
              ))}
              <div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 2 }}>
                  <span className={`e-oss__activity e-oss__activity--${tier}`}>{tier}</span>
                  {ecoTags.map(tag => (
                    <Link
                      key={tag}
                      href={`/oss?eco=${tag}`}
                      className={`e-oss__eco-badge e-oss__eco-badge--${tag}`}
                      style={{ textDecoration: "none" }}
                    >
                      {ECO_LABEL[tag]}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <a
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="e-ext-link"
              style={{ marginTop: 4 }}
            >
              View on GitHub →
            </a>
          </div>

          {/* Ecosystem badges */}
          {ecoTags.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: 10 }}>
                Ecosystem
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ecoTags.map(tag => (
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

          {/* Company */}
          {company && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 10 }}>
                Maintained by
              </div>
              <Link
                href={`/ecosystem/${company.slug}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                  color: "var(--e-fg)",
                }}
              >
                <span style={{ fontFamily: "var(--e-mono)", fontSize: 14, fontWeight: 500 }}>{company.name}</span>
                <span style={{ fontSize: 12, color: "var(--e-fg-dim)" }}>{company.sector}</span>
                <span style={{ fontSize: 12, color: "var(--e-accent)" }}>→</span>
              </Link>
            </div>
          )}

          {/* Contribution signals */}
          {openIssues > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: 10 }}>
                Contribution
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <a
                  href={`${r.href}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 13,
                    fontFamily: "var(--e-mono)",
                    color: tier === "active" ? "var(--e-accent)" : "var(--color-muted)",
                    textDecoration: "none",
                  }}
                >
                  {openIssues} open issue{openIssues !== 1 ? "s" : ""} →
                </a>
                {tier === "active" && openIssues > 0 && (
                  <span style={{ fontSize: 12, color: "var(--color-muted)" }}>
                    active project
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {topDeps.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: 12 }}>
                Dependencies ({r.dependencies?.length ?? 0} total)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {topDeps.map(dep => (
                  <Link key={dep} href={`/deps/${dep}`} style={{ textDecoration: "none" }}>
                    <span className="e-tag e-tag--soft" style={{ cursor: "pointer", fontFamily: "var(--font-ibm-plex-mono)", fontSize: 12 }}>
                      {dep}
                    </span>
                  </Link>
                ))}
                {(r.dependencies?.length ?? 0) > topDeps.length && (
                  <span className="e-tag e-tag--soft" style={{ opacity: 0.6 }}>
                    +{(r.dependencies?.length ?? 0) - topDeps.length} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Similar repos */}
          {similarRepos.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: 16 }}>
                Similar repositories
              </div>
              <div className="e-oss-grid">
                {similarRepos.map(repo => (
                  <OSSCard key={repo.href} repo={repo} depPageCounts={depPageCounts} />
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--color-border)" }}>
            <Link href="/oss" style={{ fontSize: 13, color: "var(--color-muted)", textDecoration: "none" }}>
              ← Browse all OSS repositories
            </Link>
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
