"use client"

import { useState, useEffect, type ReactNode } from "react"
import type { ClimbRoute } from "@/lib/career-paths"

const STORAGE_KEY = "osspath-climb"

const ROUTES: Array<{ id: ClimbRoute; label: string; goal: string }> = [
  { id: "learning",    label: "Learning it",   goal: "understand — small codebases you can actually read" },
  { id: "contributor", label: "Proving it",    goal: "OSS proof — repos where your PR can land this month" },
  { id: "production",  label: "Working at it", goal: "professional ability — serious production architectures" },
]

/** Owns the route choice; server-rendered legs are passed as children and
 *  filtered purely by CSS via the data-climb attribute, so all three routes
 *  stay in the HTML (SEO) and switching is instant. */
export function ClimbChooser({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<ClimbRoute>("learning")

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ClimbRoute | null
      if (saved === "learning" || saved === "contributor" || saved === "production") {
        setRoute(saved)
      }
    } catch {}
  }, [])

  const pick = (r: ClimbRoute) => {
    setRoute(r)
    try { localStorage.setItem(STORAGE_KEY, r) } catch {}
  }

  const current = ROUTES.find(r => r.id === route)!

  return (
    <div data-climb={route}>
      <div className="climb-pick" role="radiogroup" aria-label="Same mountain, three routes — where are you on this climb?">
        <span className="climb-pick__title">Your route</span>
        <div className="climb-pick__opts">
          {ROUTES.map(r => (
            <button
              key={r.id}
              role="radio"
              aria-checked={route === r.id}
              className={"climb-pick__opt" + (route === r.id ? " is-on" : "")}
              onClick={() => pick(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="climb-pick__goal" aria-live="polite">Goal: {current.goal}.</p>
      </div>
      {children}
    </div>
  )
}
