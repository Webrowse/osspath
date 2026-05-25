"use client"

import { useEffect, useRef, useState } from "react"
import type { CompanyListResult } from "@/lib/companies"
import type { CompanyFilters } from "@/types"

function filtersToParams(filters: CompanyFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (filters.q) p.set("q", filters.q)
  filters.statuses.forEach((s) => p.append("status", s))
  filters.tags.forEach((t) => p.append("tag", t))
  if (filters.remoteOnly) p.set("remote", "1")
  if (filters.rustOnly) p.set("rust", "1")
  if (filters.companyType) p.set("company_type", filters.companyType)
  if (filters.timeFilter) p.set("time", filters.timeFilter)
  if (filters.hideNotInterested) p.set("hide_ni", "1")
  if (filters.page > 1) p.set("page", String(filters.page))
  return p
}

export function useCompanies(filters: CompanyFilters, initialData: CompanyListResult) {
  const [data, setData] = useState<CompanyListResult>(initialData)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const isFirst = useRef(true)

  useEffect(() => {
    // Skip the very first render — we already have server-fetched initialData
    if (isFirst.current) {
      isFirst.current = false
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)

    const params = filtersToParams(filters)
    fetch(`/api/companies?${params.toString()}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((json: CompanyListResult) => {
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false)
      })

    return () => ctrl.abort()
  }, [filters])

  return { data, loading }
}
