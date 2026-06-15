import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { OSSCard } from "@/components/editorial/oss-card"
import {
  getCompanionIndex,
  getOSSRepos,
  getQualifiedCrates,
  getDepTopicAffinity,
  getDepPageCounts,
  DEP_PAGE_THRESHOLD,
  DEP_MAX_REPOS,
} from "@/lib/deps-data"
import { getCompaniesForDep } from "@/lib/company-data"
import { TOPIC_DISPLAY_NAMES } from "@/lib/topic-config"
import { CRATE_DESCRIPTIONS } from "@/lib/crate-descriptions"

// No fallback for params not in generateStaticParams — return 404 instead.
export const dynamicParams = false

interface PageProps {
  params: Promise<{ crate: string }>
}

// ── Static params ──────────────────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ crate: string }[]> {
  return getQualifiedCrates().map((crate) => ({ crate }))
}

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { crate } = await params
  const index = getCompanionIndex()
  const entry = index[crate]
  if (!entry || entry.repoCount < DEP_PAGE_THRESHOLD) return { title: "Not Found" }

  const displayName = crate.charAt(0).toUpperCase() + crate.slice(1)
  const title = `${displayName} Rust Projects and Repositories`
  const crateDesc = CRATE_DESCRIPTIONS[crate]
  const description = crateDesc
    ? `${crateDesc.tagline} Browse ${entry.repoCount} Rust repositories using ${crate}.`
    : `Discover ${entry.repoCount} open source Rust projects using ${crate}. Browse active repositories, stars, activity levels, maintainers, and common companion crates.`

  return {
    title,
    description,
    alternates: { canonical: `/deps/${crate}` },
    openGraph: {
      title,
      description: `${entry.repoCount} Rust repositories using ${crate} — active projects, top contributors, and companion crates.`,
      url: `/deps/${crate}`,
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: `${entry.repoCount} open source Rust projects using ${crate}.`,
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

export default async function DepPage({ params }: PageProps) {
  const { crate } = await params
  const index = getCompanionIndex()
  const entry = index[crate]

  if (!entry || entry.repoCount < DEP_PAGE_THRESHOLD) notFound()

  // All repos that depend on this crate, sorted stars desc → pushedAt desc
  const allRepos = getOSSRepos()
    .filter((r) => r.dependencies?.includes(crate))
    .sort(
      (a, b) =>
        (b.stars ?? 0) - (a.stars ?? 0) ||
        new Date(b.pushedAt ?? 0).getTime() - new Date(a.pushedAt ?? 0).getTime()
    )

  const topRepos   = allRepos.slice(0, DEP_MAX_REPOS)
  const totalStars = allRepos.reduce((s, r) => s + (r.stars ?? 0), 0)
  const activeCount = allRepos.filter((r) => r.activityTier === "active").length
  const uniqueOwners = new Set(allRepos.map((r) => r.owner).filter(Boolean)).size

  // Companions ranked by lift (topic affinity), not raw co-occurrence frequency.
  // lift = companionCoverage / globalCoverage
  // companionCoverage = repos_using_both / repos_using_target
  // globalCoverage    = repos_using_companion / total_repos
  const totalRepoCount = getOSSRepos().length // cache already warm from allRepos above
  const linkedCompanions = entry.companions
    .filter((c) => (index[c.name]?.repoCount ?? 0) >= DEP_PAGE_THRESHOLD)
    .map((c) => {
      const companionCoverage = c.count / entry.repoCount
      const globalCoverage    = (index[c.name]?.repoCount ?? 0) / totalRepoCount
      const lift              = globalCoverage > 0 ? companionCoverage / globalCoverage : 0
      return { ...c, lift }
    })
    .sort(
      (a, b) =>
        b.lift    - a.lift    ||
        b.percent - a.percent ||
        a.name.localeCompare(b.name)
    )

  const relatedTopics  = getDepTopicAffinity(allRepos)
  const depPageCounts  = getDepPageCounts()
  const dependentOrgs  = getCompaniesForDep(crate)

  const repoLabel = allRepos.length === 1 ? "repository" : "repositories"

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
          <nav aria-label="Breadcrumb" style={{ marginBottom: 24, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Link
              href="/deps"
              style={{
                fontSize: 13,
                color: "var(--e-fg-mute)",
                textDecoration: "none",
              }}
            >
              ← Dependencies
            </Link>
            <Link
              href="/oss"
              style={{
                fontSize: 13,
                color: "var(--e-fg-mute)",
                textDecoration: "none",
              }}
            >
              Repositories
            </Link>
          </nav>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header style={{ marginBottom: CRATE_DESCRIPTIONS[crate] ? 24 : 32 }}>
            <div className="e-section__num">Crate</div>
            <h1
              className="e-section__title"
              style={{ fontSize: "clamp(26px, 3.4vw, 36px)", fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              {crate}
            </h1>
            {CRATE_DESCRIPTIONS[crate] ? (
              <p style={{ marginTop: 10, fontSize: "clamp(15px, 1.6vw, 17px)", color: "var(--e-fg-mute)", lineHeight: 1.5, maxWidth: "64ch" }}>
                {CRATE_DESCRIPTIONS[crate].tagline}
              </p>
            ) : (
              <p className="e-archive-meta" style={{ marginTop: 8 }}>
                Browse Rust repositories that depend on{" "}
                <span style={{ fontFamily: "var(--font-ibm-plex-mono)" }}>{crate}</span>.
              </p>
            )}
          </header>

          {/* ── Description ─────────────────────────────────────────────────── */}
          {CRATE_DESCRIPTIONS[crate] && (() => {
            const desc = CRATE_DESCRIPTIONS[crate]!
            return (
              <div
                style={{
                  marginBottom: 40,
                  paddingBottom: 32,
                  borderBottom: "1px solid var(--e-line-soft)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 10 }}>
                    What it is
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--e-fg-mute)", maxWidth: "68ch", margin: 0 }}>
                    {desc.summary}
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 10 }}>
                    Why it is commonly used
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--e-fg-mute)", maxWidth: "68ch", margin: 0 }}>
                    {desc.usage}
                  </p>
                </div>
              </div>
            )
          })()}

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
                ["Repositories", fmt(entry.repoCount)],
                ["Total stars",  fmt(totalStars)],
                ["Active",       fmt(activeCount)],
                ["Owners",       fmt(uniqueOwners)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} style={{ minWidth: 80 }}>
                <div
                  style={{ fontSize: 22, fontWeight: 600, color: "var(--e-fg)", lineHeight: 1.1 }}
                >
                  {value}
                </div>
                <div style={{ fontSize: 11, color: "var(--e-fg-dim)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* ── Browse in Repositories CTA ──────────────────────────────────── */}
          <div style={{ marginBottom: 40 }}>
            <Link
              href={`/oss?dep=${crate}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontFamily: "var(--e-mono)",
                color: "var(--e-accent)",
                textDecoration: "none",
                border: "1px solid color-mix(in oklab, var(--e-accent) 40%, transparent)",
                borderRadius: 6,
                padding: "6px 14px",
              }}
            >
              Browse {allRepos.length} {repoLabel} using {crate} in Repos →
            </Link>
          </div>

          {/* ── Related topics ──────────────────────────────────────────────── */}
          {relatedTopics.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--e-fg-dim)",
                  marginBottom: 12,
                }}
              >
                Related topics
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {relatedTopics.map((topic) => (
                  <Link
                    key={topic}
                    href={`/topics/${topic}`}
                    style={{ textDecoration: "none" }}
                  >
                    <span className="e-tag e-tag--soft" style={{ cursor: "pointer" }}>
                      {TOPIC_DISPLAY_NAMES[topic] ?? topic}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Companion crates ────────────────────────────────────────────── */}
          {linkedCompanions.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--e-fg-dim)",
                  marginBottom: 12,
                }}
              >
                Often used with
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {linkedCompanions.map((c) => (
                  <Link
                    key={c.name}
                    href={`/deps/${c.name}`}
                    style={{ textDecoration: "none" }}
                  >
                    <span className="e-tag e-tag--soft" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: 12 }}>{c.name}</span>
                      <span style={{ color: "var(--e-fg-dim)", fontSize: 11 }}>{c.percent}%</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Organizations using this crate ──────────────────────────────── */}
          {dependentOrgs.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--e-fg-dim)",
                  marginBottom: 12,
                }}
              >
                Used by these organizations
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {dependentOrgs.map(org => (
                  <Link key={org.slug} href={`/ecosystem/${org.slug}`} style={{ textDecoration: "none" }}>
                    <span className="e-tag e-tag--soft" style={{ cursor: "pointer", fontFamily: "var(--font-ibm-plex-mono)", fontSize: 12 }}>
                      {org.name}
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
                color: "var(--e-fg-dim)",
                marginBottom: 16,
              }}
            >
              {allRepos.length <= DEP_MAX_REPOS
                ? `${allRepos.length} ${repoLabel}`
                : `${DEP_MAX_REPOS} of ${fmt(allRepos.length)} ${repoLabel} · ranked by stars`}
            </div>
            <div className="e-oss-grid">
              {topRepos.map((repo) => (
                <OSSCard key={repo.href} repo={repo} depPageCounts={depPageCounts} />
              ))}
            </div>
          </div>

          {/* ── Footer links ────────────────────────────────────────────────── */}
          <div
            style={{
              marginTop: 48,
              paddingTop: 24,
              borderTop: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
          >
            <Link
              href="/oss"
              style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}
            >
              ← Browse all repos
            </Link>
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
