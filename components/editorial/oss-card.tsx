import type { OSSPath } from "@/content/oss-paths"

function ArrowUR() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.5 7.5L7.5 2.5M7.5 2.5H3.5M7.5 2.5V6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Meter({
  label,
  value,
  valueLabel,
  accent,
}: {
  label: string
  value: number
  valueLabel: string
  accent?: boolean
}) {
  return (
    <div className="e-meter">
      <span className="e-meter__label">{label}</span>
      <span className="e-meter__bar">
        <span
          className={`e-meter__fill${accent ? " e-meter__fill--accent" : ""}`}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </span>
      <span className="e-meter__val">{valueLabel}</span>
    </div>
  )
}

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

export function OSSCard({ repo }: { repo: OSSPath }) {
  const displayTopics = (repo.topics ?? []).filter(t => t !== "rust").slice(0, 4)

  return (
    <article className="e-oss">
      <div className="e-oss__head">
        <span className="e-oss__name">{repo.name}</span>
        <span className="e-oss__eco">{repo.eco}</span>
        {repo.stars != null && (
          <span className="e-oss__stars">★ {formatStars(repo.stars)}</span>
        )}
      </div>
      <p className="e-oss__note">{repo.note}</p>
      {!(repo.maintainerFriendliness === 0.5 && repo.issueQuality === 0.5 && repo.beginnerSuitability === 0.5) && (
        <div className="e-meter-row">
          <Meter label="Maintainers" value={repo.maintainerFriendliness} valueLabel={repo.maintainerLabel} />
          <Meter label="Issues"      value={repo.issueQuality}           valueLabel={repo.issueLabel} />
          <Meter label="Beginners"   value={repo.beginnerSuitability}    valueLabel={repo.beginnerLabel} accent />
        </div>
      )}
      <div className="e-oss__foot">
        {displayTopics.length > 0 && (
          <div className="e-oss__topics">
            {displayTopics.map(t => (
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
