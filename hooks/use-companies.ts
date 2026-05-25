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
  const data = useMemo<CompanyListResult>(() => {
    const { companies, total, totalPages } = filterCompanies(initialData.allCompanies, filters)
    return {
      companies,
      total,
      totalPages,
      page: filters.page,
      pageSize: PAGE_SIZE,
      statusCounts: initialData.statusCounts,
    }
  }, [initialData, filters])

  return { data, loading: false }
}
