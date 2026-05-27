import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"

export const metadata: Metadata = {
  title: "Workflow",
  description: "How jobs.adarshrust.com works — discover remote engineering companies, track applications, monitor pipeline, and follow up without manual effort.",
}

const STEPS = [
  {
    n: "01",
    label: "Discover",
    tagline: "Find companies worth your time",
    body: "Browse curated remote-friendly companies ranked by Rust usage and hiring signal. Filter by language stack, company type, and hiring activity — not job boards full of noise.",
    detail: "Companies are tagged HEAVY / SOME / NONE for Rust signal. Hiring status reflects the last known state — updated continuously.",
    preview: <DiscoverPreview />,
  },
  {
    n: "02",
    label: "Track",
    tagline: "Move companies through your pipeline",
    body: "Add any company to your personal pipeline. Set status (Saved → Applied → Interviewing → Offer / Rejected), leave notes, and set a follow-up date.",
    detail: "All state is yours — private, per-user. No recruiter sees it. No company sees it.",
    preview: <TrackPreview />,
  },
  {
    n: "03",
    label: "Monitor",
    tagline: "Know when things change",
    body: "The dashboard surfaces what matters: overdue follow-ups, companies that started hiring after you tracked them, stale applications that deserve a nudge.",
    detail: "Stat strip shows pipeline totals at a glance. Filter by status, time window, or hiring activity.",
    preview: <MonitorPreview />,
  },
  {
    n: "04",
    label: "Follow up",
    tagline: "Stay ahead without manual tracking",
    body: "Set follow-up dates when you apply. Get a single view of everything due this week. Mark conversations as ghosted, close them, or bump the date — keeps your pipeline clean.",
    detail: "follow_up_due filter in the sidebar surfaces exactly what needs attention right now.",
    preview: <FollowUpPreview />,
  },
]

export default function WorkflowPage() {
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
      {/* Header */}
      <div
        className="workflow-header"
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "72px 32px 48px",
        }}
      >
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
          4 steps · no noise
        </div>
        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 700,
            color: "var(--fg-0)",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            margin: "0 0 16px",
          }}
        >
          How it works
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--fg-2)",
            lineHeight: 1.65,
            maxWidth: 540,
            margin: 0,
          }}
        >
          A focused workflow for engineers doing a deliberate job search — not a
          spray-and-pray ATS.
        </p>
      </div>

      {/* Steps */}
      <div
        className="workflow-steps"
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "0 32px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {STEPS.map((step, i) => (
          <StepRow key={step.n} step={step} last={i === STEPS.length - 1} />
        ))}
      </div>
    </main>
    </>
  )
}

function StepRow({
  step,
  last,
}: {
  step: (typeof STEPS)[number]
  last: boolean
}) {
  return (
    <div
      className="workflow-step-row"
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: 0,
        borderRadius: last ? "0 0 12px 12px" : step.n === "01" ? "12px 12px 0 0" : 0,
        border: "1px solid var(--line-soft)",
        borderBottom: last ? "1px solid var(--line-soft)" : "none",
        background: "var(--bg-1)",
        overflow: "hidden",
      }}
    >
      {/* Left meta */}
      <div
        className="workflow-step-meta"
        style={{
          padding: "32px 28px",
          borderRight: "1px solid var(--line-soft)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-3)",
          }}
        >
          {step.n}
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--fg-0)",
            letterSpacing: "-0.02em",
          }}
        >
          {step.label}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "var(--d-accent)",
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          {step.tagline}
        </span>
      </div>

      {/* Right content */}
      <div className="workflow-step-body" style={{ padding: "32px 32px 32px 36px" }}>
        <p
          style={{
            fontSize: 14,
            color: "var(--fg-1)",
            lineHeight: 1.65,
            margin: "0 0 16px",
          }}
        >
          {step.body}
        </p>

        {/* Mini preview */}
        <div
          style={{
            borderRadius: 8,
            border: "1px solid var(--line-soft)",
            background: "var(--bg-0)",
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {step.preview}
        </div>

        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-3)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {step.detail}
        </p>
      </div>
    </div>
  )
}

/* ── Mini UI Previews ─────────────────────────────────────────── */

function DiscoverPreview() {
  const rows = [
    { name: "Turso", rust: "HEAVY", hiring: true, tags: ["databases", "wasm"] },
    { name: "Fly.io", rust: "SOME", hiring: true, tags: ["infra", "platform"] },
    { name: "Oxide Computer", rust: "HEAVY", hiring: false, tags: ["hardware", "systems"] },
  ]
  return (
    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingBottom: 8,
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        <div
          style={{
            height: 22,
            flex: 1,
            borderRadius: 4,
            background: "var(--bg-2)",
            border: "1px solid var(--line-soft)",
            display: "flex",
            alignItems: "center",
            paddingLeft: 8,
            gap: 5,
          }}
        >
          <span style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
            search companies…
          </span>
        </div>
        <FilterChip label="Rust only" active />
        <FilterChip label="Remote" active={false} />
      </div>
      {rows.map((r: any) => (
        <div
          key={r.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "5px 0",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              background: "var(--bg-3)",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-0)", flex: 1 }}>
            {r.name}
          </span>
          <RustBadge level={r.rust} />
          {r.hiring && (
            <span
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--d-ok)",
                background: "color-mix(in oklch, var(--d-ok), transparent 85%)",
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              hiring
            </span>
          )}
          {r.tags.map((t: any) => (
            <span
              key={t}
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--fg-3)",
                background: "var(--bg-2)",
                padding: "1px 5px",
                borderRadius: 4,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function TrackPreview() {
  return (
    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg-3)", flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-0)" }}>Turso</div>
          <div style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>databases · infrastructure</div>
        </div>
        <div style={{ flex: 1 }} />
        <StatusPill label="Applied" color="var(--d-accent)" />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
        }}
      >
        <MiniField label="Applied" value="May 18, 2026" />
        <MiniField label="Follow-up" value="Jun 1, 2026" />
        <MiniField label="Comp" value="$185k" />
        <MiniField label="Recruiter" value="Glauber Costa" />
      </div>
      <div
        style={{
          padding: "6px 8px",
          borderRadius: 5,
          background: "var(--bg-2)",
          fontSize: 11,
          color: "var(--fg-2)",
          lineHeight: 1.5,
        }}
      >
        Applied via careers page. Role: systems eng. Referral from @defcon.
      </div>
    </div>
  )
}

function MonitorPreview() {
  const stats = [
    { label: "Tracked", value: "24", color: "var(--fg-0)" },
    { label: "Interviewing", value: "3", color: "var(--d-rust)" },
    { label: "Follow-up due", value: "5", color: "var(--d-warn)" },
    { label: "Applied", value: "8", color: "var(--d-accent)" },
  ]
  return (
    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--line-soft)", borderRadius: 6, overflow: "hidden" }}>
        {stats.map((s: any) => (
          <div key={s.label} style={{ background: "var(--bg-1)", padding: "8px 10px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: "var(--fg-3)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {[
          { name: "Fly.io", status: "Interviewing", badge: "active", badgeColor: "var(--d-rust)" },
          { name: "Cloudflare", status: "Applied", badge: "stale 14d", badgeColor: "var(--d-warn)" },
          { name: "Modal", status: "Saved", badge: "now hiring", badgeColor: "var(--d-ok)" },
        ].map((r: any) => (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: "var(--bg-3)", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-0)", flex: 1 }}>{r.name}</span>
            <span style={{ fontSize: 10, color: "var(--fg-3)" }}>{r.status}</span>
            <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: r.badgeColor, background: `color-mix(in oklch, ${r.badgeColor}, transparent 85%)`, padding: "1px 5px", borderRadius: 4 }}>{r.badge}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FollowUpPreview() {
  const items = [
    { name: "Turso", due: "today", overdue: false },
    { name: "Fly.io", due: "2d overdue", overdue: true },
    { name: "Linear", due: "Jun 3", overdue: false },
  ]
  return (
    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-0)" }}>Follow-up due</span>
        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--d-warn)", background: "color-mix(in oklch, var(--d-warn), transparent 85%)", padding: "1px 5px", borderRadius: 4 }}>5 this week</span>
      </div>
      {items.map((item: any) => (
        <div
          key={item.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 5,
            background: item.overdue ? "color-mix(in oklch, var(--d-danger), transparent 90%)" : "var(--bg-2)",
            border: `1px solid ${item.overdue ? "color-mix(in oklch, var(--d-danger), transparent 70%)" : "var(--line-soft)"}`,
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 4, background: "var(--bg-3)", flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-0)", flex: 1 }}>{item.name}</span>
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: item.overdue ? "var(--d-danger)" : item.due === "today" ? "var(--d-warn)" : "var(--fg-3)",
            }}
          >
            {item.due}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <MiniActionBtn label="Done" />
            <MiniActionBtn label="Snooze" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Primitives ───────────────────────────────────────────────── */

function FilterChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        padding: "2px 7px",
        borderRadius: 4,
        background: active ? "color-mix(in oklch, var(--d-accent), transparent 80%)" : "var(--bg-2)",
        color: active ? "var(--d-accent)" : "var(--fg-3)",
        border: `1px solid ${active ? "color-mix(in oklch, var(--d-accent), transparent 60%)" : "var(--line-soft)"}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  )
}

function RustBadge({ level }: { level: string }) {
  const color = level === "HEAVY" ? "var(--d-rust)" : level === "SOME" ? "var(--d-warn)" : "var(--fg-3)"
  return (
    <span
      style={{
        fontSize: 9,
        fontFamily: "var(--font-mono)",
        color,
        background: `color-mix(in oklch, ${color}, transparent 85%)`,
        padding: "1px 5px",
        borderRadius: 4,
      }}
    >
      {level}
    </span>
  )
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        color,
        background: `color-mix(in oklch, ${color}, transparent 82%)`,
        padding: "2px 8px",
        borderRadius: 10,
      }}
    >
      {label}
    </span>
  )
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "5px 7px",
        borderRadius: 5,
        background: "var(--bg-2)",
        border: "1px solid var(--line-soft)",
      }}
    >
      <div style={{ fontSize: 9, color: "var(--fg-3)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>{value}</div>
    </div>
  )
}

function MiniActionBtn({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontFamily: "var(--font-mono)",
        color: "var(--fg-3)",
        background: "var(--bg-1)",
        border: "1px solid var(--line-soft)",
        padding: "1px 5px",
        borderRadius: 4,
        cursor: "pointer",
      }}
    >
      {label}
    </span>
  )
}
