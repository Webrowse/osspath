export type ContentType = "jobs" | "oss" | "grants" | "pulse" | "events" | "companies" | "portals"

export type PendingStatus = "pending" | "approved" | "rejected"

export type PendingItem = {
  id: string
  type: ContentType
  status: PendingStatus
  source: string       // "hn-hiring" | "twir" | "manual" | "github"
  sourceUrl: string
  foundAt: string      // ISO date string
  confidence?: number  // 0-1, AI-assigned
  rawText?: string     // original scraped text
  extracted: Record<string, unknown>  // draft content fields
  whyMatched?: string  // human-readable signal explanation
  score?: number       // pre-filter score (higher = more confident match)
}

export type ScanLog = {
  source: string
  startedAt: string
  finishedAt?: string
  found: number
  added: number
  skipped: number
  errors: string[]
  // Optional per-stage diagnostics (HN: rust-filtered, remote-filtered, etc.)
  stages?: Record<string, number>
  notes?: string[]
}

export type ExtractionResult = {
  ok: boolean
  data?: Record<string, unknown>
  error?: string
}

// Maps content type to its filename stem
export const CONTENT_FILES: Record<ContentType, string> = {
  jobs:      "jobs",
  oss:       "oss",
  grants:    "grants",
  pulse:     "pulse",
  events:    "events",
  companies: "companies",
  portals:   "portals",
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  jobs:      "Jobs",
  oss:       "Repos",
  grants:    "Funding",
  pulse:     "Pulse",
  events:    "Events",
  companies: "Companies",
  portals:   "Job Portals",
}
