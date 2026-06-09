import type { OSSPath } from "@/content/oss-paths"

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

export function OSSCard({ repo }: { repo: OSSPath }) {
  const stars      = repo.stars      ?? 0
  const forks      = repo.forks      ?? 0
  const openIssues = repo.openIssuesCount ?? 0
  const owner      = repo.owner      ?? ""
  const tier       = repo.activityTier ?? "dormant"
  const topics     = (repo.topics ?? []).filter(t => t !== "rust").slice(0, 4)

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
            {topics.map(t => (
              <span key={t} className="e-tag e-tag--soft">{t}</span>
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
