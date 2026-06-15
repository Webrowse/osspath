import type { PulseItem } from "@/content/pulse"
import { formatCheckedAt } from "@/lib/content-utils"

export function PulseRow({ item }: { item: PulseItem }) {
  const freshness = formatCheckedAt(item.checkedAt)
  return (
    <a
      className="e-pulse__row"
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="e-pulse__kind">{item.kind}</span>
      <span className="e-pulse__title">
        <b>{item.title}</b>
        <span className="e-pulse__sub">{item.description}</span>
        {freshness && (
          <span style={{ display: "block", fontFamily: "var(--e-mono)", fontSize: 11, color: "var(--e-fg-faint)", marginTop: 4 }}>
            {freshness}
          </span>
        )}
      </span>
      <span className="e-pulse__arrow" aria-hidden="true">↗</span>
    </a>
  )
}
