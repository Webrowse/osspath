import type { PulseItem } from "@/content/pulse"

export function PulseRow({ item }: { item: PulseItem }) {
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
      </span>
      <span className="e-pulse__arrow" aria-hidden="true">↗</span>
    </a>
  )
}
