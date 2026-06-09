import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { OSSCard } from "@/components/editorial/oss-card"
import { getCompanionIndex, getDepPageCounts, DEP_PAGE_THRESHOLD } from "@/lib/deps-data"
import {
  getTopicRepos,
  getQualifiedTopics,
  getOSSReposForTopics,
  TOPIC_DISPLAY_NAMES,
  TOPIC_DESCRIPTIONS,
  TOPIC_PAGE_THRESHOLD,
  TOPIC_MAX_REPOS,
} from "@/lib/topics-data"

// No fallback for slugs not in generateStaticParams — return 404 instead.
export const dynamicParams = false

interface PageProps {
  params: Promise<{ topic: string }>
}

// ── Static params ──────────────────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ topic: string }[]> {
  return getQualifiedTopics().map((topic) => ({ topic }))
}

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { topic } = await params
  const displayName = TOPIC_DISPLAY_NAMES[topic]
  if (!displayName) return { title: "Not Found" }

  const repos = getTopicRepos(topic)
  if (repos.length < TOPIC_PAGE_THRESHOLD) return { title: "Not Found" }

  const count = repos.length
  const title = `Rust ${displayName} Projects (${count} Repositories)`
  const description = TOPIC_DESCRIPTIONS[topic]?.(count) ?? `Browse ${count} open source Rust ${displayName.toLowerCase()} projects.`

  return {
    title,
    description,
    alternates: { canonical: `https://jobs.adarshrust.com/topics/${topic}` },
    openGraph: {
      title,
      description,
      url: `https://jobs.adarshrust.com/topics/${topic}`,
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return n.toLocaleString()
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function TopicPage({ params }: PageProps) {
  const { topic } = await params
  const displayName = TOPIC_DISPLAY_NAMES[topic]
  if (!displayName) notFound()

  const allRepos   = getTopicRepos(topic)
  if (allRepos.length < TOPIC_PAGE_THRESHOLD) notFound()

  const topRepos     = allRepos.slice(0, TOPIC_MAX_REPOS)
  const totalStars   = allRepos.reduce((s, r) => s + (r.stars ?? 0), 0)
  const activeCount  = allRepos.filter((r) => r.activityTier === "active").length
  const uniqueOwners = new Set(allRepos.map((r) => r.owner).filter(Boolean)).size
  const count        = allRepos.length
  const repoLabel    = count === 1 ? "repository" : "repositories"

  // Find dep-page crates with highest topic affinity (lift), not raw frequency.
  // lift = topicCoverage / globalCoverage
  // topicCoverage = repos_in_topic_using_dep / total_repos_in_topic
  // globalCoverage = repos_using_dep_globally / total_repos_globally
  // Only deps present in >= 15% of topic repos qualify.
  const companionIndex = getCompanionIndex()
  const depPageCounts  = getDepPageCounts()
  const totalRepoCount = getOSSReposForTopics().length // cached; no extra I/O
  const MIN_TOPIC_COVERAGE = 0.15

  const depFreq: Record<string, number> = {}
  for (const r of allRepos) {
    for (const d of r.dependencies ?? []) {
      if ((companionIndex[d]?.repoCount ?? 0) >= DEP_PAGE_THRESHOLD) {
        depFreq[d] = (depFreq[d] ?? 0) + 1
      }
    }
  }
  const rankedDeps = Object.entries(depFreq)
    .filter(([, freq]) => freq / count >= MIN_TOPIC_COVERAGE)
    .map(([crate, freq]) => {
      const topicCoverage  = freq / count
      const globalCoverage = (companionIndex[crate]?.repoCount ?? 0) / totalRepoCount
      const lift = globalCoverage > 0 ? topicCoverage / globalCoverage : 0
      return { crate, pct: Math.round(topicCoverage * 100), lift }
    })
    .sort(
      (a, b) =>
        b.lift - a.lift ||
        b.pct  - a.pct  ||
        a.crate.localeCompare(b.crate)
    )
  const depLimit = (rankedDeps[5]?.lift ?? 0) >= 3.0 ? 8 : 5
  const topDepLinks = rankedDeps
    .slice(0, depLimit)
    .map(({ crate, pct }) => ({ crate, pct }))

  const description = TOPIC_DESCRIPTIONS[topic]?.(count) ?? `Browse ${count} open source Rust ${displayName.toLowerCase()} projects.`

  // no-std uses mono font in the heading since it renders as a Rust attribute.
  const headingMono = topic === "no-std"

  return (
    <EditorialLayout>
      <section
        style={{
          paddingTop:    "clamp(40px, 6vw, 64px)",
          paddingBottom: "clamp(64px, 9vw, 104px)",
        }}
      >
        <div className="e-col">

          {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 24 }}>
            <Link
              href="/oss"
              style={{
                fontSize: 13,
                color: "var(--color-muted)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              ← OSS Paths
            </Link>
          </nav>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header style={{ marginBottom: 32 }}>
            <div className="e-section__num">Topic</div>
            <h1
              className="e-section__title"
              style={{
                fontSize: "clamp(26px, 3.4vw, 36px)",
                ...(headingMono ? { fontFamily: "var(--font-ibm-plex-mono)" } : {}),
              }}
            >
              {displayName}
            </h1>
            <p className="e-archive-meta" style={{ marginTop: 8 }}>
              {description}
            </p>
          </header>

          {/* ── Stats strip ────────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 24px",
              marginBottom: 40,
              paddingBottom: 24,
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            {(
              [
                ["Repositories", fmt(count)],
                ["Total stars",  fmt(totalStars)],
                ["Active",       fmt(activeCount)],
                ["Owners",       fmt(uniqueOwners)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} style={{ minWidth: 80 }}>
                <div
                  style={{ fontSize: 22, fontWeight: 600, color: "var(--color-foreground)", lineHeight: 1.1 }}
                >
                  {value}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* ── Common dependencies ─────────────────────────────────────────── */}
          {topDepLinks.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--color-muted)",
                  marginBottom: 12,
                }}
              >
                Common dependencies
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {topDepLinks.map(({ crate, pct }) => (
                  <Link
                    key={crate}
                    href={`/deps/${crate}`}
                    style={{ textDecoration: "none" }}
                  >
                    <span
                      className="e-tag e-tag--soft"
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: 12 }}>{crate}</span>
                      <span style={{ color: "var(--color-muted)", fontSize: 11 }}>{pct}%</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Repository list ─────────────────────────────────────────────── */}
          <div>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-muted)",
                marginBottom: 16,
              }}
            >
              {count <= TOPIC_MAX_REPOS
                ? `${count} ${repoLabel}`
                : `${TOPIC_MAX_REPOS} of ${fmt(count)} ${repoLabel} · ranked by stars`}
            </div>
            <div className="e-oss-grid">
              {topRepos.map((repo) => (
                <OSSCard key={repo.href} repo={repo} depPageCounts={depPageCounts} />
              ))}
            </div>
          </div>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <div
            style={{
              marginTop: 48,
              paddingTop: 24,
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <Link
              href="/oss"
              style={{ fontSize: 13, color: "var(--color-muted)", textDecoration: "none" }}
            >
              ← Browse all OSS repositories
            </Link>
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
