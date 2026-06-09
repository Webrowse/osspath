"use client"

import Link from "next/link"
import type { OSSPath } from "@/content/oss-paths"

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000)      return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

const CARD_DEP_FLOOR = 40

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
  const stars      = repo.stars            ?? 0
  const forks      = repo.forks            ?? 0
  const openIssues = repo.openIssuesCount  ?? 0
  const tier       = repo.activityTier     ?? "dormant"
  const depLinks   = depPageCounts ? pickDepLinks(repo.dependencies, depPageCounts, 3) : []

  const statParts: string[] = []
  if (forks      > 0) statParts.push(`⑂ ${fmt(forks)}`)
  if (openIssues > 0) statParts.push(`◎ ${fmt(openIssues)}`)

  function handleClick() {
    window.open(repo.href, "_blank", "noopener,noreferrer")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <article
      className="e-oss"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`Open ${repo.name} on GitHub`}
    >
      <div className="e-oss__head">
        <span className="e-oss__name">{repo.name}</span>
        <span className="e-oss__stars">★ {fmt(stars)}</span>
        <span className={`e-oss__activity e-oss__activity--${tier}`}>{tier}</span>
      </div>

      <p className="e-oss__note">{repo.note}</p>

      <div className="e-oss__foot">
        {depLinks.length > 0 && (
          <div className="e-oss__deps">
            {depLinks.map((dep) => (
              <Link
                key={dep}
                href={`/deps/${dep}`}
                className="e-oss__dep-link"
                onClick={e => e.stopPropagation()}
              >
                {dep}
              </Link>
            ))}
          </div>
        )}
        {statParts.length > 0 && (
          <div className="e-oss__stats">
            {statParts.map(s => (
              <span key={s} className="e-oss__stat">{s}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
