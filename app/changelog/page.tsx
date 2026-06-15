import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"

export const metadata: Metadata = {
  title: "Changelog — Rust Atlas",
  description: "What's shipped — features, fixes, and improvements to Rust Atlas in reverse chronological order.",
  alternates: { canonical: "/changelog" },
}

type Entry = {
  version: string
  date: string
  items: { type: "feat" | "fix" | "perf" | "chore"; text: string }[]
}

const CHANGELOG: Entry[] = [
  {
    version: "0.5",
    date: "Jun 2026",
    items: [
      { type: "feat", text: "OSS Paths — ecosystem graph: repos, organizations, crates, funding programs, and jobs as connected nodes." },
      { type: "feat", text: "Hero graph — interactive journey visualization on the homepage." },
      { type: "feat", text: "Funding programs — grants, bounties, and sponsorships indexed with funded repo counts." },
      { type: "feat", text: "Dependency graph — /deps/[crate] pages showing reverse-dependency counts across the corpus." },
      { type: "feat", text: "Organization profiles — /ecosystem/[slug] pages with owned repos, funding links, and open roles." },
      { type: "chore", text: "Job Tracker archived externally. OSS Paths is now the sole product in this repository." },
    ],
  },
  {
    version: "0.4",
    date: "May 2026",
    items: [
      { type: "perf", text: "Client-side filtering — search and filter are now instant (0ms, was 140–280ms)." },
      { type: "feat", text: "Compact density mode — toggle between comfortable and compact row heights." },
      { type: "feat", text: "Workflow page — 4-step visual explanation of the tracking loop." },
      { type: "fix", text: "Auth 500 on sign-in — UntrustedHost error in NextAuth v5 beta fixed with trustHost: true." },
    ],
  },
  {
    version: "0.3",
    date: "Apr 2026",
    items: [
      { type: "feat", text: "Command palette (⌘K) — jump to any company, filter by status, switch themes." },
      { type: "feat", text: "Four themes — graphite, warm-dark, midnight, light. Persisted to localStorage." },
      { type: "feat", text: "Follow-up dates — set a date when you apply; surfaces in follow_up_due filter." },
      { type: "feat", text: "Dashboard page — pipeline summary, stat strip, recent activity." },
    ],
  },
  {
    version: "0.2",
    date: "Mar 2026",
    items: [
      { type: "feat", text: "Sidebar redesign — fixed app shell, collapsible filter groups, status counts per filter." },
      { type: "feat", text: "Grid view — toggle between list and grid in the content toolbar." },
      { type: "feat", text: "Rust level filter — HEAVY / SOME / NONE signal on every company." },
      { type: "feat", text: "Status workflow — NOT_APPLIED → APPLIED → INTERVIEWING → OFFER / REJECTED." },
    ],
  },
  {
    version: "0.1",
    date: "Feb 2026",
    items: [
      { type: "feat", text: "Initial private beta. 400+ remote-friendly companies tracked, filterable by tags." },
      { type: "feat", text: "GitHub and Google OAuth via NextAuth v5." },
      { type: "feat", text: "Per-user company state via Prisma + PostgreSQL." },
    ],
  },
]

const TYPE_META = {
  feat:  { label: "feat",  color: "var(--e-accent)" },
  fix:   { label: "fix",   color: "#c2562c" },
  perf:  { label: "perf",  color: "#6a7a3f" },
  chore: { label: "chore", color: "var(--e-fg-dim)" },
}

export default function ChangelogPage() {
  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <div className="e-section__num">History</div>
          <h1 className="e-section__title" style={{ fontSize: "clamp(22px, 3vw, 28px)", marginBottom: 8 }}>
            Changelog
          </h1>
          <p style={{ fontSize: 13, color: "var(--e-fg-dim)", fontFamily: "var(--e-mono)", margin: "0 0 40px" }}>
            what shipped, in order
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 40, maxWidth: 640 }}>
            {CHANGELOG.map((entry) => (
              <ChangelogEntry key={entry.version} entry={entry} />
            ))}
          </div>
        </div>
      </section>
    </EditorialLayout>
  )
}

function ChangelogEntry({ entry }: { entry: Entry }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: "1px solid var(--e-line-soft)",
        }}
      >
        <span style={{ fontFamily: "var(--e-mono)", fontSize: 13, fontWeight: 700, color: "var(--e-fg)" }}>
          v{entry.version}
        </span>
        <span style={{ fontFamily: "var(--e-mono)", fontSize: 11, color: "var(--e-fg-dim)" }}>
          {entry.date}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {entry.items.map((item, i) => {
          const meta = TYPE_META[item.type]
          return (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span
                style={{
                  fontFamily: "var(--e-mono)",
                  fontSize: 10,
                  color: meta.color,
                  background: `color-mix(in oklch, ${meta.color}, transparent 85%)`,
                  padding: "2px 6px",
                  borderRadius: 4,
                  flexShrink: 0,
                  marginTop: 2,
                  minWidth: 44,
                  textAlign: "center",
                }}
              >
                {meta.label}
              </span>
              <span style={{ fontSize: 13, color: "var(--e-fg-dim)", lineHeight: 1.6 }}>
                {item.text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
