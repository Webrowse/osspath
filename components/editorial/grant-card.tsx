import Link from "next/link"
import type { FundingProgram } from "@/content/grants"
import { formatCheckedAt } from "@/lib/content-utils"

const KIND_LABEL: Record<string, string> = {
  grant:           "Grant",
  fellowship:      "Fellowship",
  hackathon:       "Hackathon",
  treasury:        "Treasury",
  hardship:        "Hardship",
  "bounty-program":"Bounties",
  sponsorship:     "Sponsorship",
}

function ArrowUR() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.5 7.5L7.5 2.5M7.5 2.5H3.5M7.5 2.5V6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function GrantCard({ program }: { program: FundingProgram }) {
  const freshness = formatCheckedAt(program.checkedAt)
  return (
    <Link
      className="e-grant"
      href={`/grants/${program.slug}`}
    >
      <span className="e-grant__kind">{KIND_LABEL[program.kind] ?? program.kind}</span>
      <h3 className="e-grant__name">{program.name}</h3>
      <p className="e-grant__sub">{program.description}</p>
      {freshness && (
        <span style={{ display: "block", fontSize: 11, fontFamily: "var(--e-mono)", color: "var(--e-fg-faint)", marginBottom: 6 }}>
          {freshness}
        </span>
      )}
      <div className="e-grant__foot">
        <span>{program.status}</span>
        {program.max_award && (
          <span style={{ fontFamily: "var(--e-mono)", fontSize: 12, color: "var(--e-accent)" }}>
            {program.max_award}
          </span>
        )}
        <ArrowUR />
      </div>
    </Link>
  )
}
