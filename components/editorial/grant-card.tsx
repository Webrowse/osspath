import type { EditorialGrant } from "@/content/grants"

function ArrowUR() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.5 7.5L7.5 2.5M7.5 2.5H3.5M7.5 2.5V6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function GrantCard({ grant }: { grant: EditorialGrant }) {
  return (
    <a
      className="e-grant"
      href={grant.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="e-grant__kind">{grant.kind}</span>
      <h3 className="e-grant__name">{grant.name}</h3>
      <p className="e-grant__sub">{grant.description}</p>
      <div className="e-grant__foot">
        <span>{grant.status}</span>
        <ArrowUR />
      </div>
    </a>
  )
}
