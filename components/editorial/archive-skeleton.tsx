import type { CSSProperties } from "react"

interface Props {
  title: string
  wide?: boolean
}

export function EditorialArchiveSkeleton({ title, wide = false }: Props) {
  const col = wide ? "e-col e-col--wide" : "e-col"

  return (
    <div className="editorial-root">
      {/* Thin indeterminate progress bar — first thing the user sees */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          zIndex: 9999,
          background: "var(--e-surface-2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--e-accent)",
            animation: "e-progress 2.4s cubic-bezier(0.4, 0, 0.2, 1) forwards",
            transformOrigin: "left",
          }}
        />
      </div>

      {/* Nav shell — identical markup to EditorialLayout */}
      <header className="e-nav">
        <div className="e-col e-col--wide e-nav__inner">
          <a href="/" className="e-nav__brand" aria-label="Rust Opportunities — home">
            <span className="e-nav__mark" />
            <span>rust opportunities</span>
          </a>
          <div className="e-nav__spacer" />
          <a className="e-nav__workspace" href="/companies">
            <span>Job Tracker</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </header>

      <main>
        <section
          style={{
            paddingTop: "clamp(40px, 6vw, 64px)",
            paddingBottom: "clamp(64px, 9vw, 104px)",
          }}
        >
          <div className={col}>
            {/* Archive header */}
            <div style={{ marginBottom: 32 }}>
              <div className="e-section__num">Archive</div>
              <h1
                className="e-section__title"
                style={{ fontSize: "clamp(26px, 3.4vw, 32px)", marginTop: 4 }}
              >
                {title}
              </h1>
              <S w={320} h={14} r={3} style={{ marginTop: 10 }} />
            </div>

            {/* Skeleton rows — generic pulse blocks */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[100, 88, 94, 78, 100, 83].map((pct, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: "14px 0",
                    borderBottom: "1px solid var(--e-line-soft)",
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <S w={`${pct * 0.45}%`} h={14} r={3} style={{ animationDelay: `${i * 80}ms` }} />
                    <S w={60} h={18} r={10} style={{ animationDelay: `${i * 80 + 40}ms` }} />
                  </div>
                  <S w={`${pct}%`} h={11} r={3} style={{ animationDelay: `${i * 80 + 60}ms` }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function S({
  w,
  h,
  r = 3,
  style,
}: {
  w: number | string
  h: number
  r?: number
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: "var(--e-surface)",
        flexShrink: 0,
        animation: "e-shimmer 1.6s ease-in-out infinite",
        ...style,
      }}
    />
  )
}
