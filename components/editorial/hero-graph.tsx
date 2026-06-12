"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import type { LandingJourney, JourneyNodeType } from "@/lib/landing-data"

// ── Node metadata ──────────────────────────────────────────────────────────────

const NODE_COLORS: Record<JourneyNodeType, string> = {
  fund: "#c2562c", repo: "#3d6b9e", eco: "#6a7a3f",
  org:  "#7a5c8c", job: "#2b6b4a", crate: "#8a6030",
}

// RGB components for canvas rgba() — must match NODE_COLORS
const NODE_RGB: Record<JourneyNodeType, string> = {
  fund:  "194, 86, 44",
  repo:  "61, 107, 158",
  eco:   "106, 122, 63",
  org:   "122, 92, 140",
  job:   "43, 107, 74",
  crate: "138, 96, 48",
}

const NODE_LABELS: Record<JourneyNodeType, string> = {
  fund: "Funding", repo: "Repo", eco: "Ecosystem",
  org:  "Org",     job:  "Job",  crate: "Crate",
}

// ── Layout — positions normalized 0–1 within the graph body ──────────────────

const CARD_W    = 152  // must match .hp-hgraph__node width in CSS
const CARD_GUTTER = 10 // min px from panel edge

const STEP_POS = [
  { x: 0.21, y: 0.14 },
  { x: 0.76, y: 0.40 },
  { x: 0.23, y: 0.66 },
  { x: 0.75, y: 0.86 },
] as const

const GHOST_NODES = [
  { x: 0.50, y: 0.09, r: 5 }, { x: 0.93, y: 0.13, r: 4 },
  { x: 0.05, y: 0.45, r: 4 }, { x: 0.52, y: 0.43, r: 6 },
  { x: 0.92, y: 0.57, r: 4 }, { x: 0.65, y: 0.57, r: 5 },
  { x: 0.07, y: 0.88, r: 4 }, { x: 0.49, y: 0.80, r: 5 },
  { x: 0.91, y: 0.93, r: 4 }, { x: 0.36, y: 0.28, r: 3 },
  { x: 0.62, y: 0.14, r: 3 }, { x: 0.88, y: 0.70, r: 3 },
  { x: 0.40, y: 0.55, r: 4 },
] as const

const GHOST_EDGES: ReadonlyArray<[string, string]> = [
  ["g0","s0"],["g0","g1"],["g1","s1"],
  ["g2","s0"],["g2","g3"],
  ["g3","s1"],["g3","g5"],
  ["g4","s1"],["g4","g5"],
  ["g5","s2"],["g5","g11"],
  ["g6","s2"],["g6","g7"],
  ["g7","s3"],["g7","g8"],
  ["s0","g3"],["g9","s0"],["g9","g3"],
  ["g10","g0"],["g10","s1"],
  ["g11","s3"],["g12","s2"],["g12","s3"],
]

const PARTICLE_DEFS = [
  { edgeIdx: 0,  t: 0.00, speed: 0.000024 },
  { edgeIdx: 2,  t: 0.30, speed: 0.000019 },
  { edgeIdx: 5,  t: 0.70, speed: 0.000022 },
  { edgeIdx: 9,  t: 0.10, speed: 0.000028 },
  { edgeIdx: 12, t: 0.50, speed: 0.000017 },
  { edgeIdx: 16, t: 0.20, speed: 0.000024 },
  { edgeIdx: 1,  t: 0.80, speed: 0.000015 },
  { edgeIdx: 20, t: 0.40, speed: 0.000021 },
  { edgeIdx: 4,  t: 0.60, speed: 0.000018 },
]

// ── Journey timing ────────────────────────────────────────────────────────────

const STEP_TIMES  = [280, 800, 1320, 1840] as const
const JOURNEY_HOLD  = 3600
const JOURNEY_TOTAL = STEP_TIMES[3] + JOURNEY_HOLD  // 5440ms

// ── Canvas math helpers ───────────────────────────────────────────────────────

// Clamp a step node's x-center so the card never bleeds past the panel edge.
// HTML card positions use this (px units); canvas getPos uses same formula.
function clampX(xNorm: number, W: number): number {
  if (W === 0) return 0
  const half   = CARD_W / 2
  const gutter = CARD_GUTTER
  return Math.max(half + gutter, Math.min(W - half - gutter, xNorm * W))
}

function getPos(id: string, W: number, H: number): { x: number; y: number } {
  const i = +id.slice(1)
  if (id[0] === "s") return { x: clampX(STEP_POS[i].x, W), y: STEP_POS[i].y * H }
  const g = GHOST_NODES[i]
  return g ? { x: g.x * W, y: g.y * H } : { x: 0, y: 0 }
}

// S-curve bezier
function bezierPt(ax: number, ay: number, bx: number, by: number, t: number) {
  const c1x = ax + (bx - ax) * 0.5, c1y = ay
  const c2x = ax + (bx - ax) * 0.5, c2y = by
  const m   = 1 - t
  return {
    x: m*m*m*ax + 3*m*m*t*c1x + 3*m*t*t*c2x + t*t*t*bx,
    y: m*m*m*ay + 3*m*m*t*c1y + 3*m*t*t*c2y + t*t*t*by,
  }
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number,
  progress: number, segs = 20,
) {
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  for (let i = 1; i <= segs; i++) {
    const { x, y } = bezierPt(ax, ay, bx, by, (i / segs) * progress)
    ctx.lineTo(x, y)
  }
  ctx.stroke()
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HeroGraph({ journeys }: { journeys: LandingJourney[] }) {
  const [journeyIdx, setJourneyIdx] = useState(0)
  const [revealed,   setRevealed]   = useState(0)
  // cWidth tracks body container width for clamp-safe card positioning
  const [cWidth,     setCWidth]     = useState(0)

  const bodyRef      = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rafRef       = useRef<number>(0)
  const startRef     = useRef(0)
  const jIdxRef      = useRef(0)
  const revealedRef  = useRef(0)
  const journeysRef  = useRef(journeys)
  journeysRef.current = journeys
  const particlesRef = useRef(PARTICLE_DEFS.map(p => ({ ...p })))

  const goTo = useCallback((i: number) => {
    jIdxRef.current    = i
    revealedRef.current = 0
    startRef.current   = performance.now()
    setJourneyIdx(i)
    setRevealed(0)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const body   = bodyRef.current
    if (!canvas || !body) return

    const syncSize = () => {
      canvas.width  = body.clientWidth
      canvas.height = body.clientHeight
      setCWidth(body.clientWidth)
    }
    syncSize()
    const ro = new ResizeObserver(syncSize)
    ro.observe(body)

    startRef.current = performance.now()
    let prevTime = startRef.current

    function frame(now: number) {
      const cv = canvasRef.current
      if (!cv) { rafRef.current = requestAnimationFrame(frame); return }
      const ctx = cv.getContext("2d")
      if (!ctx) { rafRef.current = requestAnimationFrame(frame); return }

      const W = cv.width, H = cv.height
      if (!W || !H) { rafRef.current = requestAnimationFrame(frame); return }

      const dt      = now - prevTime
      prevTime      = now
      const elapsed = now - startRef.current

      ctx.clearRect(0, 0, W, H)

      // Auto-advance when hold expires
      if (elapsed >= JOURNEY_TOTAL) {
        goTo((jIdxRef.current + 1) % journeysRef.current.length)
        rafRef.current = requestAnimationFrame(frame)
        return
      }

      // Sync revealed count to React state
      let nr = 0
      for (let i = 0; i < 4; i++) { if (elapsed >= STEP_TIMES[i]) nr = i + 1 }
      if (nr !== revealedRef.current) {
        revealedRef.current = nr
        setRevealed(nr)
      }

      // Journey-specific colors from starting node type
      const jj       = journeysRef.current[jIdxRef.current]
      const startType = jj?.steps[0]?.type as JourneyNodeType | undefined
      const edgeRGB  = startType ? NODE_RGB[startType] : NODE_RGB.fund

      // ── Ghost edges ──────────────────────────────────────────────────
      ctx.lineWidth = 1
      for (const [fId, tId] of GHOST_EDGES) {
        const a = getPos(fId, W, H), b = getPos(tId, W, H)
        ctx.strokeStyle = "rgba(80, 55, 35, 0.07)"
        drawCurve(ctx, a.x, a.y, b.x, b.y, 1, 14)
      }

      // ── Ghost nodes ──────────────────────────────────────────────────
      for (const gn of GHOST_NODES) {
        const x = gn.x * W, y = gn.y * H
        ctx.beginPath(); ctx.arc(x, y, gn.r, 0, Math.PI * 2)
        ctx.fillStyle   = "rgba(194, 86, 44, 0.05)"; ctx.fill()
        ctx.strokeStyle = "rgba(194, 86, 44, 0.17)"; ctx.lineWidth = 1; ctx.stroke()
      }

      // ── Drifting particles ───────────────────────────────────────────
      for (const p of particlesRef.current) {
        p.t = (p.t + p.speed * dt) % 1
        const [fId, tId] = GHOST_EDGES[p.edgeIdx]!
        const a = getPos(fId, W, H), b = getPos(tId, W, H)
        const { x, y } = bezierPt(a.x, a.y, b.x, b.y, p.t)
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(194, 86, 44, 0.24)"; ctx.fill()
      }

      // ── Active journey edges (journey-colored) ───────────────────────
      for (let i = 0; i < 3; i++) {
        if (elapsed < STEP_TIMES[i]) break
        const done = elapsed >= STEP_TIMES[i + 1]
        const prog = done ? 1 : (elapsed - STEP_TIMES[i]) / (STEP_TIMES[i + 1] - STEP_TIMES[i])
        const a = getPos(`s${i}`, W, H), b = getPos(`s${i + 1}`, W, H)

        ctx.strokeStyle = done
          ? `rgba(${edgeRGB}, 0.40)`
          : `rgba(${edgeRGB}, 0.72)`
        ctx.lineWidth = done ? 1.5 : 2.2
        drawCurve(ctx, a.x, a.y, b.x, b.y, prog, 32)

        if (!done && prog > 0.02) {
          const { x, y } = bezierPt(a.x, a.y, b.x, b.y, prog)
          ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fillStyle = startType ? NODE_COLORS[startType] : NODE_COLORS.fund
          ctx.fill()
        }
      }

      // ── Node glow halos — starting node uses journey color + larger radius ──
      const pulse = 0.5 + 0.5 * Math.sin(now / 1800)
      for (let i = 0; i < revealedRef.current; i++) {
        const { x, y } = getPos(`s${i}`, W, H)
        const isStart  = i === 0
        const rgb      = isStart ? edgeRGB : "194, 86, 44"
        const r        = isStart ? (54 + pulse * 10) : (42 + pulse * 7)
        const grad     = ctx.createRadialGradient(x, y, 0, x, y, r)
        grad.addColorStop(0, `rgba(${rgb}, ${0.10 + pulse * 0.05})`)
        grad.addColorStop(1, `rgba(${rgb}, 0)`)
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = grad; ctx.fill()
      }

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [goTo])

  if (!journeys.length) return null
  const j = journeys[journeyIdx]

  return (
    <div className="hp-hgraph">

      {/* ── Header: tabs + path type indicator ──────────────────────── */}
      <div className="hp-hgraph__header">
        <div className="hp-journey-tabs" role="tablist">
          {journeys.map((jj, i) => (
            <button
              key={jj.id}
              role="tab"
              aria-selected={i === journeyIdx}
              className={"hp-jtab" + (i === journeyIdx ? " is-on" : "")}
              onClick={() => goTo(i)}
            >
              <span className="hp-jtab__name">{jj.name.replace(" Journey", "")}</span>
              <span className="hp-jtab__sfx"> Journey</span>
            </button>
          ))}
        </div>

        {/* Path type indicator — shows journey structure as colored chips */}
        <div className="hp-hgraph__path" aria-hidden="true">
          {j.steps.map((node, i) => (
            <span key={i} className="hp-hgraph__path-step">
              {i > 0 && <span className="hp-hgraph__path-arr">→</span>}
              <span
                className="hp-legend-tok hp-hgraph__path-tok"
                style={{ "--nc": NODE_COLORS[node.type as JourneyNodeType] } as React.CSSProperties}
              >
                <span className="hp-legend-dot" />
                {NODE_LABELS[node.type as JourneyNodeType]}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Graph body: canvas + positioned node cards ───────────────── */}
      <div ref={bodyRef} className="hp-hgraph__body">
        <canvas ref={canvasRef} className="hp-hgraph__canvas" aria-hidden="true" />

        {j.steps.map((node, i) => {
          const vis  = i < revealed
          const dest = vis && i === j.steps.length - 1
          const px   = clampX(STEP_POS[i].x, cWidth)
          return (
            <Link
              key={`${journeyIdx}-${i}`}
              href={node.href}
              className={
                "hp-hgraph__node hp-jnode" +
                (vis  ? " is-vis"  : "") +
                (dest ? " is-dest" : "") +
                (i === 0 ? " is-start" : "")
              }
              style={{
                "--nc": NODE_COLORS[node.type as JourneyNodeType],
                left:  `${px}px`,
                top:   `${STEP_POS[i].y * 100}%`,
              } as React.CSSProperties}
              tabIndex={vis ? 0 : -1}
              aria-hidden={!vis}
            >
              <span className="hp-jnode-ty">
                <span className="hp-jdot" aria-hidden="true" />
                {NODE_LABELS[node.type as JourneyNodeType]}
              </span>
              <span className="hp-jnode-lb">{node.label}</span>
              <span className="hp-jnode-sub">{node.sublabel}</span>
            </Link>
          )
        })}
      </div>

      {/* ── Footer: story caption ────────────────────────────────────── */}
      <div className="hp-hgraph__footer">
        <p className="hp-hgraph__story" aria-live="polite">{j.story}</p>
      </div>

    </div>
  )
}
