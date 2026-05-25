"use client"

import { createContext, useContext, useEffect, useState } from "react"

export type Theme = "graphite" | "warm-dark" | "midnight" | "light"
export type Density = "comfortable" | "compact"

export const THEMES: { id: Theme; label: string; dot: string }[] = [
  { id: "graphite", label: "Graphite", dot: "bg-zinc-500" },
  { id: "warm-dark", label: "Warm Dark", dot: "bg-amber-600" },
  { id: "midnight", label: "Midnight", dot: "bg-indigo-500" },
  { id: "light", label: "Light", dot: "bg-zinc-300" },
]

export const DENSITIES: { id: Density; label: string }[] = [
  { id: "comfortable", label: "Comfortable" },
  { id: "compact", label: "Compact" },
]

interface UIPreferences {
  theme: Theme
  density: Density
  setTheme: (t: Theme) => void
  setDensity: (d: Density) => void
}

const Ctx = createContext<UIPreferences | null>(null)

export function UIPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("graphite")
  const [density, setDensityState] = useState<Density>("comfortable")

  useEffect(() => {
    const t = (document.documentElement.getAttribute("data-theme") as Theme) || "graphite"
    const d =
      (document.documentElement.getAttribute("data-density") as Density) || "comfortable"
    setThemeState(t)
    setDensityState(d)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    document.documentElement.setAttribute("data-theme", t)
    if (t === "light") {
      document.documentElement.classList.remove("dark")
    } else {
      document.documentElement.classList.add("dark")
    }
    try {
      localStorage.setItem("ui-theme", t)
    } catch {}
  }

  const setDensity = (d: Density) => {
    setDensityState(d)
    document.documentElement.setAttribute("data-density", d)
    try {
      localStorage.setItem("ui-density", d)
    } catch {}
  }

  return (
    <Ctx.Provider value={{ theme, density, setTheme, setDensity }}>{children}</Ctx.Provider>
  )
}

export function useUIPreferences() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useUIPreferences must be used within UIPreferencesProvider")
  return ctx
}
