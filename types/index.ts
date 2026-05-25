import { UserCompanyStatus, RustLevel, CompanyType } from "@/lib/generated/prisma"

export type { UserCompanyStatus, RustLevel, CompanyType }

// ─── Status metadata ──────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<UserCompanyStatus, string> = {
  NOT_APPLIED: "Not Applied",
  SAVED: "Saved",
  APPLIED: "Applied",
  OA: "Online Assessment",
  RECRUITER_CALL: "Recruiter Call",
  INTERVIEWING: "Interviewing",
  FINAL_ROUND: "Final Round",
  OFFER: "Offer",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
  NO_OPENINGS: "No Openings",
  HIRING_FREEZE: "Hiring Freeze",
  NOT_INTERESTED: "Not Interested",
}

export const STATUS_COLORS: Record<UserCompanyStatus, string> = {
  NOT_APPLIED: "text-zinc-500 bg-zinc-900 border-zinc-800",
  SAVED: "text-yellow-400 bg-yellow-950 border-yellow-800",
  APPLIED: "text-blue-400 bg-blue-950 border-blue-800",
  OA: "text-purple-400 bg-purple-950 border-purple-800",
  RECRUITER_CALL: "text-cyan-400 bg-cyan-950 border-cyan-800",
  INTERVIEWING: "text-yellow-400 bg-yellow-950 border-yellow-800",
  FINAL_ROUND: "text-orange-400 bg-orange-950 border-orange-800",
  OFFER: "text-green-400 bg-green-950 border-green-800",
  REJECTED: "text-red-400 bg-red-950 border-red-800",
  GHOSTED: "text-zinc-500 bg-zinc-900 border-zinc-700",
  NO_OPENINGS: "text-zinc-400 bg-zinc-900 border-zinc-700",
  HIRING_FREEZE: "text-zinc-400 bg-zinc-900 border-zinc-700",
  NOT_INTERESTED: "text-zinc-600 bg-zinc-950 border-zinc-800",
}

// Statuses that represent active pipeline stages
export const ACTIVE_PIPELINE_STATUSES: UserCompanyStatus[] = [
  "APPLIED",
  "OA",
  "RECRUITER_CALL",
  "INTERVIEWING",
  "FINAL_ROUND",
  "OFFER",
]

// Statuses shown in the main dashboard tracker
export const DASHBOARD_STATUS_ORDER: UserCompanyStatus[] = [
  "OFFER",
  "FINAL_ROUND",
  "INTERVIEWING",
  "RECRUITER_CALL",
  "OA",
  "APPLIED",
  "SAVED",
  "GHOSTED",
  "REJECTED",
  "NO_OPENINGS",
  "HIRING_FREEZE",
]

// ─── Time filter ──────────────────────────────────────────────────────────────

export type TimeFilter =
  | "applied_today"
  | "applied_7d"
  | "applied_30d"
  | "applied_older_30d"
  | "not_checked_7d"
  | "not_checked_14d"
  | "updated_7d"
  | "follow_up_due"

export const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  applied_today: "Applied today",
  applied_7d: "Applied last 7 days",
  applied_30d: "Applied last 30 days",
  applied_older_30d: "Applied 30+ days ago",
  not_checked_7d: "Not checked in 7 days",
  not_checked_14d: "Not checked in 14 days",
  updated_7d: "Updated last 7 days",
  follow_up_due: "Follow-up due",
}

// ─── Company metadata ─────────────────────────────────────────────────────────

export const RUST_LEVEL_LABELS: Record<RustLevel, string> = {
  NONE: "No Rust",
  PARTIAL: "Some Rust",
  HEAVY: "Heavy Rust",
  CORE: "Rust Core",
}

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  STARTUP: "Startup",
  SCALEUP: "Scaleup",
  ENTERPRISE: "Enterprise",
  OPEN_SOURCE: "Open Source",
  AGENCY: "Agency",
}

export const ALL_TAGS = [
  "Rust",
  "Backend",
  "Infrastructure",
  "DevTools",
  "AI Infra",
  "Distributed Systems",
  "Databases",
  "Security",
  "Performance",
  "Cloud",
  "Linux",
  "Networking",
  "Observability",
  "Storage",
  "Compilers",
  "Open Source",
  "Systems",
] as const

export type Tag = (typeof ALL_TAGS)[number]

// ─── Filter params ────────────────────────────────────────────────────────────

export interface CompanyFilters {
  q: string
  statuses: UserCompanyStatus[]
  tags: string[]
  remoteOnly: boolean
  rustOnly: boolean
  companyType: CompanyType | null
  timeFilter: TimeFilter | null
  hideNotInterested: boolean
  page: number
}

export const PAGE_SIZE = 24

export function parseFilters(params: Record<string, string | string[] | undefined>): CompanyFilters {
  const raw = (key: string) => params[key]
  const arr = (key: string): string[] => {
    const v = params[key]
    if (!v) return []
    return Array.isArray(v) ? v : [v]
  }

  return {
    q: (raw("q") as string) ?? "",
    statuses: arr("status").filter((s): s is UserCompanyStatus =>
      Object.keys(STATUS_LABELS).includes(s)
    ),
    tags: arr("tag"),
    remoteOnly: raw("remote") === "1",
    rustOnly: raw("rust") === "1",
    companyType: (raw("company_type") as CompanyType) ?? null,
    timeFilter: (raw("time") as TimeFilter) ?? null,
    hideNotInterested: raw("hide_ni") === "1",
    page: Math.max(1, parseInt((raw("page") as string) ?? "1", 10) || 1),
  }
}
