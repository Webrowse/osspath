import type { EcosystemEvent } from "@/content/events"

function ArrowUR() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.5 7.5L7.5 2.5M7.5 2.5H3.5M7.5 2.5V6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Validate that day/month look like intentional editorial values, not raw numbers. */
function isValidDay(day: string): boolean {
  if (day === "—") return true
  // Accept abbreviated months used as day labels (RustConf uses "Sep", "Oct")
  const monthAbbrevs = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  if (monthAbbrevs.includes(day)) return true
  // Accept 1-31 as day numbers only if they look like editorial intent
  // Reject bare numeric strings that came from bad data entry
  const n = Number(day)
  return !isNaN(n) && n >= 1 && n <= 31 && day.length <= 2
}

function isValidMonth(month: string): boolean {
  if (!month || month.trim() === "") return false
  // Reject bare numeric months — these are data entry errors
  const n = Number(month)
  if (!isNaN(n)) return false
  return true
}

export function EventCard({ event }: { event: EcosystemEvent }) {
  // Hard guard: skip cards with invalid date metadata
  if (!isValidMonth(event.month) || !isValidDay(event.day)) return null

  return (
    <article className="e-event">
      <div className="e-event__date">
        {event.day !== "—" && <span className="e-d">{event.day}</span>}
        <span className="e-m">{event.month}{event.year ? ` ${event.year}` : ""}</span>
      </div>
      <div className="e-event__main">
        <h3 className="e-event__title">{event.title}</h3>
        <span className="e-event__meta">{event.meta}</span>
      </div>
      <a
        className="e-ext-link"
        href={event.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={event.title}
      >
        <span>{event.recurring ? "Info" : "Join"}</span>
        <ArrowUR />
      </a>
    </article>
  )
}
