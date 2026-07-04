"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import type { HeroCrateEvidence } from "@/lib/landing-data"

// Auto-rotate through crates until the visitor interacts, mirroring the
// previous hero's cadence. One interval, cleared on first manual pick.
const ROTATE_MS = 7000

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000)      return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

export function HeroEvidence({
  crates,
  totalRepos,
  lastAnalyzed,
}: {
  crates:       HeroCrateEvidence[]
  totalRepos:   number
  lastAnalyzed: string
}) {
  const [idx, setIdx]   = useState(0)
  const [isMac, setIsMac] = useState(true)
  const pinnedRef       = useRef(false)
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)

  const pick = useCallback((i: number) => {
    pinnedRef.current = true
    if (timerRef.current) clearInterval(timerRef.current)
    setIdx(i)
  }, [])

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform))
    timerRef.current = setInterval(() => {
      if (!pinnedRef.current) setIdx(i => (i + 1) % crates.length)
    }, ROTATE_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [crates.length])

  if (!crates.length) return null
  const c = crates[idx]

  return (
    <div className="hp-hev">

      {/* ── Crate tabs ─────────────────────────────────────────────── */}
      <div className="hp-hev__header">
        <div className="hp-journey-tabs" role="tablist" aria-label="Pick a crate">
          {crates.map((cc, i) => (
            <button
              key={cc.crate}
              role="tab"
              aria-selected={i === idx}
              className={"hp-jtab" + (i === idx ? " is-on" : "")}
              onClick={() => pick(i)}
            >
              {cc.crate}
            </button>
          ))}
        </div>
      </div>

      {/* ── Evidence body — keyed so a tab switch re-runs the entrance fade ── */}
      <div className="hp-hev__body" key={c.crate}>

        <div className="hp-hev__crate">
          <Link href={c.href} className="hp-hev__crate-name">{c.crate}</Link>
          <span className="hp-hev__crate-stats">
            <b>{c.repoCount.toLocaleString("en-US")}</b> repos use it
            <span className="hp-hev__sep">·</span>
            <b>{c.activePct}%</b> actively maintained
          </span>
          <p className="hp-hev__tagline">{c.tagline}</p>
        </div>

        <div className="hp-hev__block">
          <div className="hp-hev__label">Projects using {c.crate} also use</div>
          <div className="hp-hev__companions">
            {c.companions.map(comp => (
              <Link key={comp.name} href={comp.href} className="hp-hev__comp-row">
                <span className="hp-hev__comp-name">{comp.name}</span>
                <span className="hp-hev__comp-bar-wrap" aria-hidden="true">
                  <span className="hp-hev__comp-bar" style={{ width: `${comp.percent}%` }} />
                </span>
                <span className="hp-hev__comp-pct">{comp.percent}%</span>
              </Link>
            ))}
          </div>
        </div>

        {c.topRepos.length > 0 && (
          <div className="hp-hev__block">
            <div className="hp-hev__label">Read it in real code</div>
            <div className="hp-hev__repos">
              {c.topRepos.map(r => (
                <Link key={r.fullName} href={r.href} className="hp-hev__repo">
                  <span className="hp-hev__repo-name">{r.fullName}</span>
                  <span className="hp-hev__repo-stars">★ {fmt(r.stars)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {c.orgs.length > 0 && (
          <div className="hp-hev__block">
            <div className="hp-hev__label">Built on commercially by</div>
            <div className="hp-hev__orgs">
              {c.orgs.map(o => (
                <Link key={o.href} href={o.href} className="hp-hev__org">{o.name}</Link>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Provenance footer ──────────────────────────────────────── */}
      <div className="hp-hev__footer">
        <span>
          Computed from Cargo manifests of {totalRepos.toLocaleString("en-US")} indexed
          repositories · verified {lastAnalyzed}
        </span>
        <span className="hp-hev__kbd-hint">
          <kbd>{isMac ? "⌘" : "Ctrl"}</kbd><kbd>K</kbd> any crate or repo
        </span>
      </div>

    </div>
  )
}
