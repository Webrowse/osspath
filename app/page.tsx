import Link from "next/link"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navbar } from "@/components/navbar"
import {
  ArrowRight,
  Flame,
  Users,
  Zap,
  Target,
  Sparkles,
  Search,
} from "lucide-react"

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h)
  }
  return `oklch(0.70 0.16 ${Math.abs(h) % 360})`
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((w: any) => w[0] ?? "").slice(0, 2).join("").toUpperCase()
}

// Demo data for preview sections
const DEMO_COMPANIES = [
  {
    id: 1, name: "Cloudflare", domain: "cloudflare.com",
    desc: "Building the future of the internet with edge computing and zero-trust security.",
    tags: ["Rust", "Infrastructure", "Security"],
    hiring: "actively-hiring" as const, openings: 14, status: "interviewing" as const,
  },
  {
    id: 2, name: "Fly.io", domain: "fly.io",
    desc: "Deploy full-stack apps and databases close to your users with globally distributed VMs.",
    tags: ["Rust", "Cloud", "DevOps"],
    hiring: "actively-hiring" as const, openings: 8, status: "applied" as const,
  },
  {
    id: 3, name: "Oxide Computer", domain: "oxide.computer",
    desc: "Cloud computers for the datacenter — hardware and software co-designed from silicon up.",
    tags: ["Rust", "Systems", "Hardware"],
    hiring: "selective" as const, openings: 3, status: "saved" as const,
  },
  {
    id: 4, name: "Turso", domain: "turso.tech",
    desc: "Edge SQLite databases built for the distributed-first world. Fast, embedded, consistent.",
    tags: ["Rust", "Databases", "Edge"],
    hiring: "actively-hiring" as const, openings: 6, status: "none" as const,
  },
  {
    id: 5, name: "Zed Industries", domain: "zed.dev",
    desc: "A high-performance, collaborative code editor written from scratch in Rust.",
    tags: ["Rust", "DevTools", "Editor"],
    hiring: "actively-hiring" as const, openings: 5, status: "none" as const,
  },
  {
    id: 6, name: "ClickHouse", domain: "clickhouse.com",
    desc: "Open-source column-oriented database for real-time analytics at petabyte scale.",
    tags: ["C++", "Databases", "Performance"],
    hiring: "actively-hiring" as const, openings: 18, status: "applied" as const,
  },
]

const STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  applied: { color: "var(--d-accent)", bg: "var(--d-accent-soft)", label: "Applied" },
  interviewing: { color: "var(--d-rust)", bg: "var(--d-rust-soft)", label: "Interviewing" },
  saved: { color: "var(--fg-2)", bg: "oklch(0.5 0 0 / 0.1)", label: "Saved" },
  rejected: { color: "var(--d-danger)", bg: "var(--d-danger-soft)", label: "Rejected" },
  none: { color: "var(--fg-3)", bg: "transparent", label: "" },
}

const ROADMAP_ITEMS = [
  {
    stage: "Now", title: "Companies + tracking",
    desc: "Full company database, 13-status pipeline tracking, sidebar filters, quick filter presets.",
    color: "var(--d-ok)",
  },
  {
    stage: "Q3", title: "Openings + timelines",
    desc: "Per-role timelines, recruiter contacts, compensation comparison.",
    color: "var(--d-accent)",
  },
  {
    stage: "Q4", title: "Smart queues",
    desc: "Resurface stale applications, suggest follow-up windows, batch outreach.",
    color: "var(--d-rust)",
  },
  {
    stage: "2027", title: "Career intelligence",
    desc: "Cohort comp data, hiring trends, automated discovery for your stack.",
    color: "var(--d-warn)",
  },
]

const FILTER_FEATURES = [
  {
    icon: <Zap size={14} />,
    title: "Instant filtering",
    desc: "No reloads, no waterfalls — all filters apply in under a frame.",
  },
  {
    icon: <Target size={14} />,
    title: "Quick filters",
    desc: "One-tap presets for active pipeline, overdue follow-ups, and recently saved.",
  },
  {
    icon: <Sparkles size={14} />,
    title: "Follow-up tracking",
    desc: "Set follow-up dates when you apply. Surface everything overdue in one filter.",
  },
]

export default async function HomePage() {
  const [session, companyCount, remoteCount, hiringCount] = await Promise.all([
    getSession(),
    prisma.company.count(),
    prisma.company.count({ where: { remote: true } }),
    prisma.company.count({ where: { isHiring: true } }),
  ])

  return (
    <>
      <Navbar />
      <div
        style={{
          background: "var(--bg-0)",
          color: "var(--fg-1)",
          minHeight: "100vh",
        }}
      >
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section
          id="hero"
          className="landing-hero-grid"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "80px 32px 56px",
            display: "grid",
            gridTemplateColumns: "1.05fr 1fr",
            gap: 56,
            alignItems: "center",
          }}
        >
          {/* Left: text + CTAs + trust */}
          <div>
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 10px 5px 7px",
                borderRadius: 999,
                background: "var(--bg-2)",
                border: "1px solid var(--line-soft)",
                fontSize: 11.5,
                color: "var(--fg-2)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: "var(--d-rust-soft)",
                  color: "var(--d-rust)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Flame size={11} />
              </span>
              <span style={{ color: "var(--fg-0)" }}>now in private beta</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>tracking {companyCount} companies</span>
            </div>

            {/* Headline */}
            <h1
              className="landing-h1"
              style={{
                margin: "20px 0 0",
                fontSize: 52,
                lineHeight: 1.05,
                fontWeight: 600,
                color: "var(--fg-0)",
                letterSpacing: "-0.025em",
              }}
            >
              A career operating system{" "}
              <br />
              for{" "}
              <span
                style={{
                  background: "linear-gradient(95deg, var(--d-rust) 20%, var(--d-accent) 80%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                remote engineers
              </span>
              .
            </h1>

            <p
              style={{
                marginTop: 22,
                fontSize: 16,
                lineHeight: 1.55,
                color: "var(--fg-2)",
                maxWidth: 520,
              }}
            >
              Discover high-signal opportunities in the Rust ecosystem, track every application,
              and stop losing momentum to dozens of open tabs. Built for engineers who treat
              their job search like a system.
            </p>

            {/* CTAs */}
            <div
              className="landing-cta-row"
              style={{
                display: "flex",
                gap: 10,
                marginTop: 28,
                alignItems: "center",
              }}
            >
              <Link
                href="/companies"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: "oklch(0.99 0 0)",
                  background: "var(--d-accent)",
                  boxShadow: "0 1px 0 oklch(1 0 0 / 0.2) inset, 0 8px 24px -10px var(--d-accent)",
                  textDecoration: "none",
                }}
              >
                Explore workspace
                <ArrowRight size={13} />
              </Link>
              <Link
                href={session ? "/dashboard" : "/login"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 8,
                  fontSize: 14,
                  color: "var(--fg-0)",
                  border: "1px solid var(--line)",
                  textDecoration: "none",
                }}
              >
                <Users size={13} style={{ color: "var(--fg-2)" }} />
                {session ? "Open dashboard" : "Sign in"}
              </Link>
              <span
                style={{
                  fontSize: 11.5,
                  color: "var(--fg-3)",
                  fontFamily: "var(--font-mono)",
                  marginLeft: 4,
                }}
              >
                free during beta
              </span>
            </div>

            {/* Trust strip */}
            <div
              style={{
                marginTop: 44,
                paddingTop: 24,
                borderTop: "1px solid var(--line-soft)",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 24,
              }}
            >
              {[
                { k: String(companyCount), l: "companies indexed", c: "var(--fg-0)" },
                { k: String(hiringCount), l: "actively hiring now", c: "var(--d-rust)" },
                { k: `${Math.round((remoteCount / companyCount) * 100)}%`, l: "remote-first", c: "var(--d-accent)" },
              ].map((x, i) => (
                <div key={i}>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: x.c,
                      letterSpacing: "-0.01em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {x.k}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                    {x.l}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: HeroPreview */}
          <div className="landing-hero-preview">
            <HeroPreview companyCount={companyCount} />
          </div>
        </section>

        {/* ── Companies Preview ─────────────────────────────────────────────── */}
        <section
          id="companies"
          className="landing-companies-section"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "40px 32px 64px",
          }}
        >
          <SectionHeader
            kicker="Companies"
            title="High-signal opportunities, curated like a tasting menu."
            desc="Every company is hand-picked for engineering depth, remote culture, and compensation transparency. No agencies. No ghost listings."
          />

          <div
            className="landing-companies-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              marginTop: 28,
            }}
          >
            {DEMO_COMPANIES.slice(0, 6).map((c: any) => (
              <PreviewCard key={c.id} company={c} />
            ))}
          </div>

          <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
            <Link
              href="/companies"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--fg-1)",
                border: "1px solid var(--line)",
                textDecoration: "none",
              }}
            >
              Explore all {companyCount} companies
              <ArrowRight size={12} />
            </Link>
          </div>
        </section>

        {/* ── Filters Section ───────────────────────────────────────────────── */}
        <section
          id="how-it-works"
          style={{
            background: "var(--bg-1)",
            borderTop: "1px solid var(--line-soft)",
            borderBottom: "1px solid var(--line-soft)",
          }}
        >
          <div
            className="landing-filters-inner"
            style={{
              maxWidth: 1240,
              margin: "0 auto",
              padding: "72px 32px",
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr",
              gap: 56,
              alignItems: "center",
            }}
          >
            <div>
              <SectionHeader
                kicker="Filters"
                title={
                  <>
                    Slice {companyCount} companies
                    <br />
                    down to the 12 that matter.
                  </>
                }
                desc="Stack filters by stage, compensation, remote region, hiring state and tracking status. Saved views remember your stack between sessions."
                inline
              />
              <ul
                style={{
                  marginTop: 24,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {FILTER_FEATURES.map((f, i) => (
                  <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        flexShrink: 0,
                        background: "var(--bg-3)",
                        border: "1px solid var(--line-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--d-accent)",
                      }}
                    >
                      {f.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "var(--fg-0)",
                        }}
                      >
                        {f.title}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--fg-2)",
                          marginTop: 2,
                          lineHeight: 1.45,
                        }}
                      >
                        {f.desc}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="landing-filters-preview">
              <FiltersPreview />
            </div>
          </div>
        </section>

        {/* ── Dashboard Workspace ───────────────────────────────────────────── */}
        <section
          id="workspace"
          className="landing-workspace-section"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "72px 32px",
          }}
        >
          <SectionHeader
            kicker="Workspace"
            title={<>One view for every conversation in flight.</>}
            desc="Track applications across status, surface follow-ups before they go stale, and keep momentum without spreadsheets, browser tabs, or that one Notion page from 2023."
            centered
          />

          <div className="landing-dash-preview">
            <DashboardPreview />
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
            <Link
              href={session ? "/companies" : "/login"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 40,
                padding: "0 16px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: "oklch(0.99 0 0)",
                background: "var(--d-accent)",
                boxShadow: "0 1px 0 oklch(1 0 0 / 0.2) inset, 0 8px 24px -10px var(--d-accent)",
                textDecoration: "none",
              }}
            >
              Open workspace
              <ArrowRight size={13} />
            </Link>
          </div>
        </section>

        {/* ── Roadmap ───────────────────────────────────────────────────────── */}
        <section
          id="roadmap"
          style={{
            background: "var(--bg-1)",
            borderTop: "1px solid var(--line-soft)",
          }}
        >
          <div
            className="landing-roadmap-inner"
            style={{
              maxWidth: 1240,
              margin: "0 auto",
              padding: "64px 32px",
            }}
          >
            <SectionHeader
              kicker="Roadmap"
              title={<>From job board → career operating system.</>}
              desc="We started by indexing Rust companies. We're building toward a system that knows your pipeline better than you do."
            />

            <div
              className="landing-roadmap-grid"
              style={{
                marginTop: 32,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 14,
              }}
            >
              {ROADMAP_ITEMS.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: 18,
                    borderRadius: 10,
                    background: "var(--bg-2)",
                    border: "1px solid var(--line-soft)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: item.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: item.color,
                        flexShrink: 0,
                      }}
                    />
                    {item.stage}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--fg-0)",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--fg-2)",
                      lineHeight: 1.45,
                    }}
                  >
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="landing-footer" style={{ padding: "40px 32px 56px" }}>
          <div
            className="landing-footer-inner"
            style={{
              maxWidth: 1240,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--fg-3)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span>jobs.adarshrust · built by remote engineers, for remote engineers</span>
            <span>v0.4.2 · 2026.05</span>
          </div>
        </footer>
      </div>
    </>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  kicker,
  title,
  desc,
  centered,
  inline,
}: {
  kicker: string
  title: React.ReactNode
  desc?: string
  centered?: boolean
  inline?: boolean
}) {
  return (
    <div
      style={{
        textAlign: centered ? "center" : "left",
        maxWidth: centered ? 720 : inline ? undefined : 640,
        margin: centered ? "0 auto" : 0,
      }}
    >
      <div
        style={{
          display: "inline-block",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--d-accent)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 12,
        }}
      >
        — {kicker}
      </div>
      <h2
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 600,
          color: "var(--fg-0)",
          letterSpacing: "-0.018em",
          lineHeight: 1.15,
        }}
      >
        {title}
      </h2>
      {desc && (
        <p
          style={{
            marginTop: 10,
            fontSize: 15,
            color: "var(--fg-2)",
            lineHeight: 1.5,
            maxWidth: centered ? 580 : 540,
            marginLeft: centered ? "auto" : 0,
            marginRight: centered ? "auto" : 0,
          }}
        >
          {desc}
        </p>
      )}
    </div>
  )
}

// ── Preview card ──────────────────────────────────────────────────────────────

function PreviewCard({
  company,
}: {
  company: (typeof DEMO_COMPANIES)[0]
}) {
  const color = hashColor(company.name)
  const initials = getInitials(company.name)
  const isHiring = company.hiring === "actively-hiring"

  return (
    <Link
      href={`/companies`}
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--line-soft)",
        borderRadius: 10,
        padding: 16,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        textDecoration: "none",
        transition: "border-color 140ms, transform 140ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklch, ${color}, transparent 55%) 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            fontSize: 12,
            color: "oklch(0.99 0 0)",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)" }}
          >
            {company.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--fg-3)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {company.domain}
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: isHiring ? "var(--d-ok)" : "var(--fg-3)",
          }}
        >
          <MiniPulse isHiring={isHiring} />
          {company.openings}
        </div>
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--fg-1)",
          lineHeight: 1.45,
        }}
      >
        {company.desc}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {company.tags.slice(0, 3).map((t: any) => (
          <span
            key={t}
            style={{
              display: "inline-flex",
              padding: "2px 7px",
              borderRadius: 5,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              background: "var(--bg-3)",
              color: "var(--fg-2)",
              border: "1px solid var(--line-soft)",
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </Link>
  )
}

// ── HeroPreview ──────────────────────────────────────────────────────────────

function HeroPreview({ companyCount }: { companyCount: number }) {
  return (
    <div
      style={{
        position: "relative",
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 30px 80px -30px oklch(0 0 0 / 0.6), 0 0 0 1px var(--line-soft)",
        transform: "perspective(2000px) rotateY(-3deg) rotateX(2deg)",
      }}
    >
      {/* Browser titlebar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 12px",
          borderBottom: "1px solid var(--line-soft)",
          background: "var(--bg-2)",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: "oklch(0.66 0.18 22 / 0.7)",
          }}
        />
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: "oklch(0.78 0.13 80 / 0.7)",
          }}
        />
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: "oklch(0.72 0.14 155 / 0.7)",
          }}
        />
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
            }}
          >
            jobs.adarshrust.com/companies
          </span>
        </div>
      </div>

      {/* Fake explorer */}
      <div style={{ display: "flex", height: 380 }}>
        {/* Sidebar */}
        <div
          style={{
            width: 130,
            background: "var(--bg-1)",
            borderRight: "1px solid var(--line-soft)",
            padding: "10px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            fontSize: 11,
          }}
        >
          {[
            { l: "Companies", a: true, n: companyCount },
            { l: "Tracking", n: 18 },
            { l: "Saved", n: 7 },
          ].map((x, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                padding: "5px 7px",
                borderRadius: 5,
                background: x.a ? "var(--bg-3)" : "transparent",
                color: x.a ? "var(--fg-0)" : "var(--fg-2)",
              }}
            >
              <span style={{ flex: 1 }}>{x.l}</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>
                {x.n}
              </span>
            </div>
          ))}
          <div
            style={{
              height: 1,
              background: "var(--line-soft)",
              margin: "8px 0",
            }}
          />
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              color: "var(--fg-3)",
              padding: "4px 7px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Filters
          </div>
          {[
            { l: "Applied", dot: "var(--d-accent)" },
            { l: "Interviewing", dot: "var(--d-rust)", on: true },
            { l: "Follow-up due", dot: "var(--d-warn)", on: true },
            { l: "Actively hiring", dot: "var(--d-ok)" },
            { l: "Remote only", dot: "var(--fg-2)" },
          ].map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 7px",
                borderRadius: 5,
                color: f.on ? "var(--fg-0)" : "var(--fg-2)",
                background: f.on ? "var(--bg-3)" : "transparent",
              }}
            >
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 3,
                  border: `1.5px solid ${f.on ? "var(--d-accent)" : "var(--line)"}`,
                  background: f.on ? "var(--d-accent)" : "transparent",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 999,
                  background: f.dot,
                  flexShrink: 0,
                }}
              />
              <span>{f.l}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            background: "var(--bg-0)",
          }}
        >
          {/* Search bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 26,
              padding: "0 10px",
              borderRadius: 6,
              background: "var(--bg-2)",
              border: "1px solid var(--line-soft)",
              fontSize: 11,
              color: "var(--fg-3)",
            }}
          >
            <Search size={11} />
            <span>actively hiring · rust</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "var(--font-mono)" }}>⌘K</span>
          </div>

          {/* Result count + chips */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-0)",
              }}
            >
              14
            </span>
            <span style={{ fontSize: 11, color: "var(--fg-3)" }}>results</span>
            {["interviewing", "follow-up due"].map((chip: any) => (
              <span
                key={chip}
                style={{
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  background: "var(--bg-2)",
                  border: "1px solid var(--line-soft)",
                  color: "var(--fg-2)",
                }}
              >
                {chip}
              </span>
            ))}
          </div>

          {/* Mini company cards grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 4,
            }}
          >
            {DEMO_COMPANIES.slice(0, 4).map((c: any) => {
              const color = hashColor(c.name)
              const initials = getInitials(c.name)
              return (
                <div
                  key={c.id}
                  style={{
                    background: "var(--bg-1)",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 8,
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 7 }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 5,
                        background: `linear-gradient(135deg, ${color}, color-mix(in oklch, ${color}, transparent 55%))`,
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        fontWeight: 600,
                        color: "oklch(0.99 0 0)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--fg-0)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.name}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "var(--fg-2)",
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    } as React.CSSProperties}
                  >
                    {c.desc}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                    {c.tags.slice(0, 2).map((t: any) => (
                      <span
                        key={t}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          padding: "1px 4px",
                          borderRadius: 3,
                          background: "var(--bg-3)",
                          color: "var(--fg-2)",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FiltersPreview ────────────────────────────────────────────────────────────

function FiltersPreview() {
  const filtered = DEMO_COMPANIES.filter(
    (c: any) => c.hiring === "actively-hiring" && c.status !== "none"
  ).slice(0, 3)

  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line-soft)",
        borderRadius: 14,
        padding: 16,
        boxShadow: "0 20px 60px -30px oklch(0 0 0 / 0.5)",
      }}
    >
      <div
        style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16 }}
      >
        {/* Filter rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--fg-3)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Tracking
            </div>
            {[
              { l: "Applied", c: "var(--d-accent)", on: true, n: 5 },
              { l: "Interviewing", c: "var(--d-rust)", on: true, n: 2 },
              { l: "Saved", c: "var(--fg-2)", n: 7 },
              { l: "Follow-up", c: "var(--d-warn)", on: true, n: 5 },
            ].map((x, i) => (
              <FilterRow key={i} {...x} />
            ))}
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--fg-3)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Hiring
            </div>
            {[
              { l: "Actively hiring", c: "var(--d-ok)", on: true },
              { l: "Selective", c: "var(--d-warn)" },
              { l: "No openings", c: "var(--fg-3)" },
            ].map((x, i) => (
              <FilterRow key={i} {...x} />
            ))}
          </div>
        </div>

        {/* Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              padding: 8,
              borderRadius: 7,
              background: "var(--bg-3)",
              border: "1px solid var(--line-soft)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--fg-0)",
              }}
            >
              9
            </span>
            <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
              results matching
            </span>
            {[
              { l: "Applied", c: "var(--d-accent)" },
              { l: "Interviewing", c: "var(--d-rust)" },
              { l: "Follow-up", c: "var(--d-warn)" },
              { l: "Actively hiring", c: "var(--d-ok)" },
            ].map((p, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "1px 6px 1px 8px",
                  borderRadius: 4,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  background: "var(--bg-1)",
                  border: "1px solid var(--line-soft)",
                  color: "var(--fg-1)",
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: p.c,
                  }}
                />
                {p.l}
                <span style={{ opacity: 0.5 }}>×</span>
              </span>
            ))}
          </div>

          {filtered.map((c: any) => {
            const color = hashColor(c.name)
            const initials = getInitials(c.name)
            const st = STATUS_COLORS[c.status] ?? STATUS_COLORS.none
            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: 9,
                  borderRadius: 7,
                  background: "var(--bg-1)",
                  border: "1px solid var(--line-soft)",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: `linear-gradient(135deg, ${color}, color-mix(in oklch, ${color}, transparent 55%))`,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "oklch(0.99 0 0)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--fg-0)",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--fg-3)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.desc}
                  </div>
                </div>
                {st.label && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "2px 7px",
                      borderRadius: 10,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      background: st.bg,
                      color: st.color,
                      border: `1px solid color-mix(in oklch, ${st.color}, transparent 60%)`,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 999,
                        background: st.color,
                        flexShrink: 0,
                      }}
                    />
                    {st.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FilterRow({
  l,
  c,
  on,
  n,
}: {
  l: string
  c: string
  on?: boolean
  n?: number
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "4px 7px",
        borderRadius: 5,
        background: on ? "var(--bg-3)" : "transparent",
        color: on ? "var(--fg-0)" : "var(--fg-2)",
        fontSize: 11.5,
        marginBottom: 1,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          border: `1.5px solid ${on ? "var(--d-accent)" : "var(--line)"}`,
          background: on ? "var(--d-accent)" : "transparent",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 999,
          background: c,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1 }}>{l}</span>
      {n != null && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-3)",
          }}
        >
          {n}
        </span>
      )}
    </div>
  )
}

// ── DashboardPreview ──────────────────────────────────────────────────────────

function DashboardPreview() {
  return (
    <div
      style={{
        marginTop: 32,
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 40px 100px -40px oklch(0 0 0 / 0.6)",
      }}
    >
      <div style={{ display: "flex", height: 460 }}>
        {/* Icon sidebar */}
        <div
          style={{
            width: 52,
            background: "var(--bg-1)",
            borderRight: "1px solid var(--line-soft)",
            padding: "12px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i: any) => (
            <div
              key={i}
              style={{
                width: 34,
                height: 30,
                borderRadius: 6,
                background: i === 0 ? "var(--bg-3)" : "transparent",
                opacity: i === 0 ? 1 : 0.4,
              }}
            />
          ))}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Topbar */}
          <div
            style={{
              height: 44,
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              gap: 10,
              borderBottom: "1px solid var(--line-soft)",
              background: "var(--bg-1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                flex: 1,
                maxWidth: 380,
                height: 26,
                padding: "0 8px",
                borderRadius: 6,
                background: "var(--bg-2)",
                border: "1px solid var(--line-soft)",
                fontSize: 11,
                color: "var(--fg-3)",
              }}
            >
              <Search size={11} />
              <span>Search companies, tags, locations…</span>
              <div style={{ flex: 1 }} />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  padding: "1px 4px",
                  borderRadius: 3,
                  border: "1px solid var(--line)",
                }}
              >
                ⌘K
              </span>
            </div>
            <div style={{ flex: 1 }} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--fg-3)",
                padding: "2px 7px",
                borderRadius: 4,
                border: "1px solid var(--line-soft)",
              }}
            >
              comfy
            </span>
            <span
              style={{
                display: "flex",
                gap: 1,
                padding: 2,
                borderRadius: 5,
                border: "1px solid var(--line-soft)",
              }}
            >
              {[0, 1, 2].map((i: any) => (
                <span
                  key={i}
                  style={{
                    width: 22,
                    height: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 3,
                    background: i === 0 ? "var(--bg-3)" : "transparent",
                  }}
                />
              ))}
            </span>
          </div>

          {/* Body */}
          <div
            style={{
              flex: 1,
              padding: 16,
              background: "var(--bg-0)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflow: "hidden",
            }}
          >
            {/* Stat strip */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 1,
                background: "var(--line-soft)",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid var(--line-soft)",
              }}
            >
              {[
                { l: "TRACKED", v: "18", s: "across pipeline", c: "var(--fg-0)" },
                { l: "INTERVIEWING", v: "2", s: "active", c: "var(--d-rust)" },
                { l: "FOLLOW-UP", v: "5", s: "overdue", c: "var(--d-warn)" },
                { l: "APPLIED", v: "9", s: "awaiting reply", c: "var(--d-accent)" },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{ padding: "8px 10px", background: "var(--bg-1)" }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      color: "var(--fg-3)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {s.l}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 5,
                      marginTop: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: s.c,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {s.v}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--fg-3)" }}>
                      {s.s}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Mini company cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
              }}
            >
              {DEMO_COMPANIES.map((c: any) => {
                const color = hashColor(c.name)
                const initials = getInitials(c.name)
                const st = STATUS_COLORS[c.status] ?? STATUS_COLORS.none
                return (
                  <div
                    key={c.id}
                    style={{
                      background: "var(--bg-1)",
                      border: "1px solid var(--line-soft)",
                      borderRadius: 8,
                      padding: 10,
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {c.status !== "none" && (
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 8,
                          bottom: 8,
                          width: 2,
                          background: st.color,
                          opacity: 0.7,
                          borderRadius: "0 2px 2px 0",
                        }}
                      />
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: `linear-gradient(135deg, ${color}, color-mix(in oklch, ${color}, transparent 55%))`,
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          fontWeight: 600,
                          color: "oklch(0.99 0 0)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--fg-0)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.name}
                        </div>
                        <div
                          style={{ fontSize: 10, color: "var(--fg-3)" }}
                        >
                          {c.domain}
                        </div>
                      </div>
                      {st.label && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "1px 6px",
                            borderRadius: 8,
                            fontFamily: "var(--font-mono)",
                            fontSize: 9.5,
                            background: st.bg,
                            color: st.color,
                            border: `1px solid color-mix(in oklch, ${st.color}, transparent 65%)`,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: 999,
                              background: st.color,
                            }}
                          />
                          {st.label}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--fg-2)",
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      } as React.CSSProperties}
                    >
                      {c.desc}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        paddingTop: 6,
                        borderTop: "1px dashed var(--line-soft)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--fg-2)",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MiniPulse isHiring={c.hiring === "actively-hiring"} />
                        {c.openings} open
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function MiniPulse({ isHiring }: { isHiring: boolean }) {
  const color = isHiring ? "var(--d-ok)" : "var(--fg-3)"
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        width: 6,
        height: 6,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          background: color,
          opacity: isHiring ? 0.9 : 0.4,
        }}
      />
    </span>
  )
}
