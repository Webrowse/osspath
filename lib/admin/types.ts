export type ContentType = "jobs" | "oss" | "grants" | "pulse" | "events" | "companies" | "portals" | "news" | "authors"

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
  stages?: Record<string, number>
  notes?: string[]
}

export type ExtractionResult = {
  ok: boolean
  data?: Record<string, unknown>
  error?: string
}

// Content type registration, labels, filenames, and form fields now live in
// ./content-schema (CONTENT_SCHEMA, CONTENT_TYPES) - the single registry for
// every published content type.
