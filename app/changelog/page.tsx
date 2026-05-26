import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"

export const metadata: Metadata = {
  title: "Changelog · jobs.adarshrust",
  description: "What's shipped in jobs.adarshrust.",
}

type Entry = {
  version: string
  date: string
  items: { type: "feat" | "fix" | "perf" | "chore"; text: string }[]
}

const CHANGELOG: Entry[] = [
  {
    version: "0.4",
    date: "May 2026",
    items: [
      { type: "perf", text: "Client-side filtering — search and filter are now instant (0ms, was 140–280ms). All companies load once; no API calls on interaction." },
      { type: "feat", text: "Compact density mode — toggle between comfortable and compact row heights in the toolbar." },
      { type: "feat", text: "Workflow page — 4-step visual explanation of the tracking loop." },
      { type: "feat", text: "Changelog page — this page." },
      { type: "fix", text: "Auth 500 on sign-in — UntrustedHost error in NextAuth v5 beta fixed with trustHost: true." },
      { type: "fix", text: "Sidebar logo now links back to landing page." },
    ],
  },
  {
    version: "0.3",
    date: "Apr 2026",
    items: [
      { type: "feat", text: "Command palette (⌘K) — jump to any company, filter by status, switch themes, toggle density." },
      { type: "feat", text: "Four themes — graphite (default), warm-dark, midnight, light. Persisted to localStorage." },
      { type: "feat", text: "Follow-up dates — set a date when you apply; surfaces in follow_up_due filter." },
      { type: "feat", text: "Dashboard page — pipeline summary, stat strip, recent activity." },
      { type: "fix", text: "Stale closure in search input — filtersRef pattern prevents captured state on fast typing." },
    ],
  },
  {
    version: "0.2",
    date: "Mar 2026",
    items: [
      { type: "feat", text: "Sidebar redesign — fixed app shell, collapsible filter groups, status counts per filter." },
      { type: "feat", text: "Grid view — toggle between list and grid in the content toolbar." },
      { type: "feat", text: "Rust level filter — HEAVY / SOME / NONE signal on every company." },
      { type: "feat", text: "Hiring signal — companies marked active/passive/unknown based on open roles." },
      { type: "feat", text: "Status workflow — NOT_APPLIED → INTERESTED → APPLIED → INTERVIEWING → OFFER / REJECTED / NOT_INTERESTED." },
      { type: "chore", text: "Migrated from Pages Router to App Router." },
    ],
  },
  {
    version: "0.1",
    date: "Feb 2026",
    items: [
      { type: "feat", text: "Initial private beta. 400+ remote-friendly companies tracked, filterable by tags and company type." },
      { type: "feat", text: "GitHub and Google OAuth via NextAuth v5." },
      { type: "feat", text: "Per-user company state (status, notes, applied date) via Prisma + PostgreSQL." },
    ],
  },
]

const TYPE_META = {
  feat: { label: "feat", color: "var(--d-accent)" },
  fix: { label: "fix", color: "var(--d-rust)" },
  perf: { label: "perf", color: "var(--d-ok)" },
  chore: { label: "chore", color: "var(--fg-3)" },
}

export default function ChangelogPage() {
  return (
    <>
      <Navbar />
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-0)",
        paddingBottom: 80,
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "72px 32px 48px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 10px",
            borderRadius: 20,
            background: "var(--bg-2)",
            border: "1px solid var(--line-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-3)",
            marginBottom: 24,
          }}
        >
          jobs.adarshrust
        </div>
        <h1
          style={{
            fontSize: "clamp(26px, 5vw, 38px)",
            fontWeight: 700,
            color: "var(--fg-0)",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            margin: "0 0 12px",
          }}
        >
          Changelog
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--fg-3)",
            fontFamily: "var(--font-mono)",
            margin: "0 0 48px",
          }}
        >
          what shipped, in order
        </p>

        {/* Entries */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {CHANGELOG.map((entry: any) => (
            <ChangelogEntry key={entry.version} entry={entry} />
          ))}
        </div>
      </div>
    </main>
    </>
  )
}

function ChangelogEntry({ entry }: { entry: Entry }) {
  return (
    <div>
      {/* Version header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--fg-0)",
          }}
        >
          v{entry.version}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-3)",
          }}
        >
          {entry.date}
        </span>
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {entry.items.map((item, i) => {
          const meta = TYPE_META[item.type]
          return (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
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
              <span
                style={{
                  fontSize: 13,
                  color: "var(--fg-1)",
                  lineHeight: 1.6,
                }}
              >
                {item.text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
