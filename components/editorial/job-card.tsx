import type { EditorialJob } from "@/content/jobs"
import { formatCheckedAt } from "@/lib/content-utils"

function ArrowUR() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.5 7.5L7.5 2.5M7.5 2.5H3.5M7.5 2.5V6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function isJuniorOrIntern(tag: string) {
  const t = tag.toLowerCase()
  return t.includes("junior") || t.includes("intern")
}

export function JobCard({ job }: { job: EditorialJob }) {
  const freshness = formatCheckedAt(job.checkedAt)

  // Build a quiet trust metadata line: "Rust · Remote · Checked today"
  const trustParts: string[] = []
  if (job.rustMentioned)   trustParts.push("Rust explicit")
  if (job.remoteConfirmed) trustParts.push("Remote confirmed")
  if (freshness)           trustParts.push(freshness)
  const trustLine = trustParts.join(" · ")

  return (
    <article className="e-job">
      <div className="e-job__main">
        <div className="e-job__head">
          <span className="e-job__role">{job.role}</span>
          <span className="e-job__company">— {job.company}</span>
        </div>
        <p className="e-job__note">{job.note}</p>
        <div className="e-job__footer">
          <div className="e-job__tags">
            {job.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className={`e-tag${isJuniorOrIntern(t) ? " e-tag--accent" : ""}`}
              >
                {t}
              </span>
            ))}
          </div>
          {trustLine && <span className="e-trust-line">{trustLine}</span>}
        </div>
      </div>
      <a
        className="e-ext-link e-job__cta"
        href={job.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${job.role} at ${job.company}`}
      >
        <span>Open</span>
        <ArrowUR />
      </a>
    </article>
  )
}
