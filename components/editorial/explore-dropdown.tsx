"use client"

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { EXPLORE_NAV } from "@/lib/nav-config"

export function ExploreDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClickOutside)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="e-explore" ref={ref}>
      <button
        className={`e-nav__link e-explore__trigger${open ? " e-explore__trigger--open" : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
      >
        Explore
        <svg
          className="e-explore__chevron"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="e-explore__panel" role="menu">
          {EXPLORE_NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="e-explore__item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className="e-explore__item-label">{l.label}</span>
              <span className="e-explore__item-desc">{l.description}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
