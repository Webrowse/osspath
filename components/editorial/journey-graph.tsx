"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import type { LandingJourney, JourneyNodeType } from "@/lib/landing-data"

const NODE_COLORS: Record<JourneyNodeType, string> = {
  fund:  "#c2562c",
  repo:  "#3d6b9e",
  eco:   "#6a7a3f",
  org:   "#7a5c8c",
  job:   "#2b6b4a",
  crate: "#8a6030",
}

const NODE_LABELS: Record<JourneyNodeType, string> = {
  fund:  "Funding",
  repo:  "Repo",
  eco:   "Ecosystem",
  org:   "Org",
  job:   "Job",
  crate: "Crate",
}

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

export function JourneyGraph({ journeys, vertical }: { journeys: LandingJourney[]; vertical?: boolean }) {
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(0)
  // cancelledRef tracks whether the current effect run should stop
  const cancelledRef = useRef(false)

  const goTo = useCallback((i: number) => {
    cancelledRef.current = true
    setIdx(i)
    setRevealed(0)
  }, [])

  useEffect(() => {
    if (!journeys.length) return
    cancelledRef.current = false
    const steps = journeys[idx].steps

    ;(async () => {
      for (let i = 0; i < steps.length; i++) {
        await delay(i === 0 ? 280 : 500)
        if (cancelledRef.current) return
        setRevealed(i + 1)
      }
      await delay(3600)
      if (cancelledRef.current) return
      goTo((idx + 1) % journeys.length)
    })()

    return () => { cancelledRef.current = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, journeys.length])

  if (!journeys.length) return null
  const j = journeys[idx]

  const chainCls = "hp-journey-chain" + (vertical ? " is-vert" : "")

  return (
    <div className={"hp-journey" + (vertical ? " hp-journey--vert" : "")}>
      <div className="hp-journey-tabs" role="tablist">
        {journeys.map((jj, i) => (
          <button
            key={jj.id}
            role="tab"
            aria-selected={i === idx}
            className={"hp-jtab" + (i === idx ? " is-on" : "")}
            onClick={() => goTo(i)}
          >
            {jj.name}
          </button>
        ))}
      </div>

      <div className={chainCls} aria-live="polite" aria-label="Graph journey visualization">
        {j.steps.map((node, i) => {
          const vis = i < revealed
          const dest = vis && i === j.steps.length - 1
          return (
            <div key={`${idx}-${i}`} className="hp-jstep">
              {i > 0 && (
                <span className="hp-jarrow" aria-hidden="true">
                  {vertical ? "↓" : "→"}
                </span>
              )}
              <Link
                href={node.href}
                className={"hp-jnode" + (vis ? " is-vis" : "") + (dest ? " is-dest" : "")}
                style={{ "--nc": NODE_COLORS[node.type] } as React.CSSProperties}
                tabIndex={vis ? 0 : -1}
                aria-hidden={!vis}
              >
                <span className="hp-jnode-ty">
                  <span className="hp-jdot" aria-hidden="true" />
                  {NODE_LABELS[node.type]}
                </span>
                <span className="hp-jnode-lb">{node.label}</span>
                <span className="hp-jnode-sub">{node.sublabel}</span>
              </Link>
            </div>
          )
        })}
      </div>

      <p className="hp-journey-story">{j.story}</p>
    </div>
  )
}
