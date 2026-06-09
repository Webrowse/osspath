import Link from "next/link"
import type { OSSPath } from "@/content/oss-paths"
import { getTopicPageSlug } from "@/lib/topic-config"

function ArrowUR() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.5 7.5L7.5 2.5M7.5 2.5H3.5M7.5 2.5V6.5"
        stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000)      return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

// Minimum repoCount preferred for card dep links.
// Keeps proc-macro helpers, test-only crates, and sys bindings out of slot 1-3.
// The >=25 pool is still used as fallback when fewer than `limit` qualify at >=40.
const CARD_DEP_FLOOR = 40

// Selects up to `limit` dep links for a card.
// Primary set: repoCount >= CARD_DEP_FLOOR, sorted ascending (most specific first).
// Fallback: fills remaining slots from the full >=25 qualified pool, also ascending.
function pickDepLinks(
  deps: string[] | undefined,
  depPageCounts: Record<string, number>,
  limit: number
): string[] {
  if (!deps?.length) return []
  const qualified = deps.filter((d) => d in depPageCounts)
  const preferred = qualified
    .filter((d) => (depPageCounts[d] ?? 0) >= CARD_DEP_FLOOR)
    .sort((a, b) => (depPageCounts[a] ?? 0) - (depPageCounts[b] ?? 0))
    .slice(0, limit)
  if (preferred.length >= limit) return preferred
  const preferredSet = new Set(preferred)
  const fallback = qualified
    .filter((d) => !preferredSet.has(d))
    .sort((a, b) => (depPageCounts[a] ?? 0) - (depPageCounts[b] ?? 0))
    .slice(0, limit - preferred.length)
  return [...preferred, ...fallback]
}

export function OSSCard({
  repo,
  depPageCounts,
}: {
  repo: OSSPath
  depPageCounts?: Record<string, number>
}) {
  const stars      = repo.stars      ?? 0
  const forks      = repo.forks      ?? 0
  const openIssues = repo.openIssuesCount ?? 0
  const owner      = repo.owner      ?? ""
  const tier       = repo.activityTier ?? "dormant"
  const topics     = (repo.topics ?? []).filter(t => t !== "rust").slice(0, 4)
  const depLinks   = depPageCounts ? pickDepLinks(repo.dependencies, depPageCounts, 3) : []

  const statParts: string[] = []
  if (forks      > 0) statParts.push(`⑂ ${fmt(forks)} forks`)
  if (openIssues > 0) statParts.push(`◎ ${fmt(openIssues)} issues`)

  return (
    <article className="e-oss">
      <div className="e-oss__head">
        <span className="e-oss__name">{repo.name}</span>
        <span className={`e-oss__activity e-oss__activity--${tier}`}>{tier}</span>
        <span className="e-oss__stars">★ {fmt(stars)}</span>
      </div>

      {owner && (
        <div className="e-oss__owner-sub">{owner}</div>
      )}

      <p className="e-oss__note">{repo.note}</p>

      {statParts.length > 0 && (
        <div className="e-oss__stats">
          {statParts.map(s => (
            <span key={s} className="e-oss__stat">{s}</span>
          ))}
        </div>
      )}

      <div className="e-oss__foot">
        {topics.length > 0 && (
          <div className="e-oss__topics">
            {topics.map(t => {
              const slug = getTopicPageSlug(t)
              return slug ? (
                <Link key={t} href={`/topics/${slug}`} className="e-tag e-tag--soft">
                  {t}
                </Link>
              ) : (
                <span key={t} className="e-tag e-tag--soft">{t}</span>
              )
            })}
          </div>
        )}

        {depLinks.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {depLinks.map((dep) => (
              <Link
                key={dep}
                href={`/deps/${dep}`}
                className="e-tag e-tag--soft"
                style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: 11 }}
              >
                {dep}
              </Link>
            ))}
          </div>
        )}

        <a
          className="e-ext-link"
          href={repo.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Open repo</span>
          <ArrowUR />
        </a>
      </div>
    </article>
  )
}
