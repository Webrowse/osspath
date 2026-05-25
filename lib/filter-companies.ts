import type { CompanyListItem } from "@/lib/companies"
import type { CompanyFilters } from "@/types"
import { PAGE_SIZE } from "@/types"

export type FilteredResult = {
  companies: CompanyListItem[]
  total: number
  totalPages: number
}

export function filterCompanies(
  all: CompanyListItem[],
  filters: CompanyFilters,
): FilteredResult {
  const now = new Date()
  const q = filters.q.trim().toLowerCase()

  const filtered = all.filter((company) => {
    // Text search — name first (fast path), then description
    if (q) {
      const nameMatch = company.name.toLowerCase().includes(q)
      const descMatch = !nameMatch && company.description.toLowerCase().includes(q)
      if (!nameMatch && !descMatch) return false
    }

    // Boolean flags
    if (filters.remoteOnly && !company.remote) return false
    if (filters.rustOnly && company.rustLevel === "NONE") return false
    if (filters.companyType && company.companyType !== filters.companyType) return false

    // Tag filter — company must have every selected tag
    if (filters.tags.length > 0) {
      if (!filters.tags.every((t) => company.tags.includes(t))) return false
    }

    // Status filter
    if (filters.statuses.length > 0) {
      const currentStatus = company.userState?.status ?? null
      const hasNotApplied = filters.statuses.includes("NOT_APPLIED")
      const others = filters.statuses.filter((s) => s !== "NOT_APPLIED") as string[]

      if (hasNotApplied && others.length === 0) {
        if (currentStatus !== null && currentStatus !== "NOT_APPLIED") return false
      } else if (hasNotApplied) {
        if (currentStatus !== null && !others.includes(currentStatus)) return false
      } else {
        if (!currentStatus || !others.includes(currentStatus)) return false
      }
    }

    // Hide NOT_INTERESTED
    if (filters.hideNotInterested && company.userState?.status === "NOT_INTERESTED") {
      return false
    }

    // Time filters — require a userState to exist
    if (filters.timeFilter) {
      const state = company.userState
      if (!state) return false

      const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000)
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      switch (filters.timeFilter) {
        case "applied_today":
          if (!state.appliedAt || state.appliedAt < today) return false
          break
        case "applied_7d":
          if (!state.appliedAt || state.appliedAt < daysAgo(7)) return false
          break
        case "applied_30d":
          if (!state.appliedAt || state.appliedAt < daysAgo(30)) return false
          break
        case "applied_older_30d":
          if (!state.appliedAt || state.appliedAt >= daysAgo(30)) return false
          break
        case "not_checked_7d":
          if (state.lastCheckedAt && state.lastCheckedAt >= daysAgo(7)) return false
          break
        case "not_checked_14d":
          if (state.lastCheckedAt && state.lastCheckedAt >= daysAgo(14)) return false
          break
        case "updated_7d":
          if (state.updatedAt < daysAgo(7)) return false
          break
        case "follow_up_due":
          if (!state.followUpAt || state.followUpAt > now) return false
          break
      }
    }

    return true
  })

  const total = filtered.length
  const skip = (filters.page - 1) * PAGE_SIZE
  return {
    companies: filtered.slice(skip, skip + PAGE_SIZE),
    total,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
  }
}
