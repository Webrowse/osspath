"use client"

import { useState, useEffect } from "react"

type ETheme = "light" | "dark" | "system"

function getEffective(): ETheme {
  if (typeof window === "undefined") return "system"
  const stored = localStorage.getItem("e-theme") as ETheme | null
  return stored ?? "system"
}

function apply(theme: ETheme) {
  const el = document.documentElement
  if (theme === "system") {
    el.removeAttribute("data-e-theme")
    localStorage.removeItem("e-theme")
  } else {
    el.setAttribute("data-e-theme", theme)
    localStorage.setItem("e-theme", theme)
  }
}

export function EditorialThemeToggle() {
  const [theme, setTheme] = useState<ETheme>("system")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTheme(getEffective())
    setMounted(true)
  }, [])

  function cycle() {
    const next: ETheme = theme === "system" ? "dark" : theme === "dark" ? "light" : "system"
    apply(next)
    setTheme(next)
  }

  if (!mounted) return null

  const label = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "Auto"

  return (
    <button
      className="e-theme-btn"
      onClick={cycle}
      aria-label={`Theme: ${label}. Click to cycle.`}
      title={`Theme: ${label}`}
      type="button"
    >
      {theme === "dark"   ? <MoonIcon /> :
       theme === "light"  ? <SunIcon /> :
                            <AutoIcon />}
    </button>
  )
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="2.8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 1v1.4M7 11.6V13M1 7h1.4M11.6 7H13M2.9 2.9l1 1M10.1 10.1l1 1M2.9 11.1l1-1M10.1 3.9l1-1"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M11.5 8.5A5 5 0 0 1 5.5 2.5a5 5 0 1 0 6 6z"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AutoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 2v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7 2a5 5 0 0 1 0 10z" fill="currentColor" fillOpacity="0.25" />
    </svg>
  )
}
