import type { Portal } from "@/content/portals"

export function PortalRow({ portal }: { portal: Portal }) {
  return (
    <a
      className="e-pulse__row"
      href={portal.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="e-pulse__kind">{portal.kind}</span>
      <span className="e-pulse__title">
        <b>{portal.name}</b>
        <span className="e-pulse__sub">{portal.description}</span>
      </span>
      <span className="e-pulse__arrow" aria-hidden="true">↗</span>
    </a>
  )
}
