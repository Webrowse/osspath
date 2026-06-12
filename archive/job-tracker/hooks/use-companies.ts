"use client"

import { useMemo } from "react"
import { filterCompanies } from "@/lib/filter-companies"
import type { CompaniesClientData, CompanyListResult } from "@/lib/companies"
import type { CompanyFilters } from "@/types"
import { PAGE_SIZE } from "@/types"

export function useCompanies(
  filters: CompanyFilters,
  initialData: CompaniesClientData,
): { data: CompanyListResult; loading: false } {
  // These two counts are derived from the full dataset (not the filtered page)
  // and only change when initialData changes — safe to separate from the filter memo.
  const followUpDue = useMemo(() => {
    const now = new Date()
    return initialData.allCompanies.filter(
      (c) => c.userState?.followUpAt && new Date(c.userState.followUpAt) <= now,
    ).length
  }, [initialData])

  const newOpenings = useMemo(() => {
    const cutoff = new Date(Date.now() - 14 * 86_400_000)
    return initialData.allCompanies.filter(
      (c) => c.isHiring && c.lastHiringCheckAt && new Date(c.lastHiringCheckAt) >= cutoff,
    ).length
  }, [initialData])

  const data = useMemo<CompanyListResult>(() => {
    const { companies, total, totalPages } = filterCompanies(initialData.allCompanies, filters)
    return {
      companies,
      total,
      totalPages,
      page: filters.page,
      pageSize: PAGE_SIZE,
      statusCounts: initialData.statusCounts,
      followUpDue,
      newOpenings,
    }
  }, [initialData, filters, followUpDue, newOpenings])

  return { data, loading: false }
}
