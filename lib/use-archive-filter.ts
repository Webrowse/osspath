"use client"

import { useEffect, useMemo, useState } from "react"
import { matchesQuery } from "@/lib/content-utils"

// Client-side replacement for the old searchParams-driven filtering. Reading
// the query from window.location.search on mount (instead of accepting a
// `searchParams` prop on the page) keeps the archive page fully static —
// awaiting `searchParams` in a Server Component forces Next to render that
// route dynamically on every request, which is what was driving needless
// per-request work on crawler traffic. See app/oss's static conversion for
// the same pattern.
export function useArchiveFilter<T extends Record<string, unknown>>(items: T[]) {
  const [q, setQ] = useState("")

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q")
    if (initial) setQ(initial)
  }, [])

  const filtered = useMemo(
    () => (q ? items.filter((item) => matchesQuery(item, q)) : items),
    [items, q],
  )

  function onQueryChange(value: string) {
    setQ(value)
    const params = new URLSearchParams(window.location.search)
    if (value) params.set("q", value)
    else params.delete("q")
    const qs = params.toString()
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname)
  }

  return { q, filtered, onQueryChange }
}
