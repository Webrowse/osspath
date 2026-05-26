import type { CompanyListItem } from "@/lib/companies"
import type { CompanyFilters } from "@/types"
import { PAGE_SIZE } from "@/types"

const RUST_RANK: Record<string, number> = { CORE: 4, HEAVY: 3, PARTIAL: 2, NONE: 1 }

export type FilteredResult = {
  companies: CompanyListItem[]
  total: number
  totalPages: number
}

// Dates are stored as UTC midnight ("YYYY-MM-DD" → new Date("YYYY-MM-DD")).
// All calendar-day comparisons use UTC components so the offset is consistent
// regardless of the server's local timezone.
function calendarDaysAgo(now: Date, d: Date): number {
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const dUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return Math.round((todayUTC - dUTC) / 86_400_000)
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
      const others: string[] = filters.statuses.filter((s) => s !== "NOT_APPLIED")

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

      switch (filters.timeFilter) {
        case "applied_today": {
          if (!state.appliedAt) return false
          if (calendarDaysAgo(now, state.appliedAt) !== 0) return false
          break
        }
        case "applied_7d": {
          // Exclusive bucket: applied 1–7 calendar days ago (not today)
          if (!state.appliedAt) return false
          const d = calendarDaysAgo(now, state.appliedAt)
          if (d < 1 || d > 7) return false
          break
        }
        case "applied_30d": {
          // Exclusive bucket: applied 8–30 calendar days ago
          if (!state.appliedAt) return false
          const d = calendarDaysAgo(now, state.appliedAt)
          if (d < 8 || d > 30) return false
          break
        }
        case "applied_older_30d": {
          if (!state.appliedAt) return false
          if (calendarDaysAgo(now, state.appliedAt) <= 30) return false
          break
        }
        case "not_checked_7d": {
          // Cumulative: never reviewed, or last review was 7+ days ago
          if (state.lastCheckedAt && calendarDaysAgo(now, state.lastCheckedAt) < 7) return false
          break
        }
        case "not_checked_14d": {
          // Cumulative: never reviewed, or last review was 14+ days ago
          if (state.lastCheckedAt && calendarDaysAgo(now, state.lastCheckedAt) < 14) return false
          break
        }
        case "updated_7d": {
          if (calendarDaysAgo(now, state.updatedAt) > 7) return false
          break
        }
        case "follow_up_due": {
          if (!state.followUpAt || state.followUpAt > now) return false
          break
        }
      }
    }

    return true
  })

  // Sort
  const sort = filters.sort ?? "name_asc"
  if (sort === "rust_desc") {
    filtered.sort((a, b) => (RUST_RANK[b.rustLevel] ?? 1) - (RUST_RANK[a.rustLevel] ?? 1) || a.name.localeCompare(b.name))
  } else if (sort === "hiring_first") {
    filtered.sort((a, b) => Number(b.isHiring) - Number(a.isHiring) || a.name.localeCompare(b.name))
  } else if (sort === "verified_recent") {
    filtered.sort((a, b) => {
      const at = a.lastHiringCheckAt ? new Date(a.lastHiringCheckAt).getTime() : 0
      const bt = b.lastHiringCheckAt ? new Date(b.lastHiringCheckAt).getTime() : 0
      return bt - at || a.name.localeCompare(b.name)
    })
  }
  // name_asc is the default order from the DB query (already sorted by name)

  const total = filtered.length
  const skip = (filters.page - 1) * PAGE_SIZE
  return {
    companies: filtered.slice(skip, skip + PAGE_SIZE),
    total,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
  }
}
