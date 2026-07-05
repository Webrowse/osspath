/**
 * Client-safe curation types, constants, and pure computations. No imports -
 * this module is shared by client components (repo table, queue cards) and
 * the server data layer in ./curation, which must stay out of client bundles
 * because it touches Prisma.
 */

// ── Override shapes ───────────────────────────────────────────────────────────

export type HideReason = "spam" | "abandoned" | "low-quality" | "irrelevant"
export const HIDE_REASONS: HideReason[] = ["spam", "abandoned", "low-quality", "irrelevant"]

export type Difficulty = "beginner" | "intermediate" | "advanced"
export const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"]

/** Mirrors the public career path slugs in lib/career-paths.ts. */
export type CareerPath = "backend" | "systems" | "infrastructure" | "embedded"
export const CAREER_PATHS: CareerPath[] = ["backend", "systems", "infrastructure", "embedded"]

export type QueueId = "rising" | "hidden-gems" | "needs-review" | "popular-suspicious"
export const QUEUE_IDS: QueueId[] = ["rising", "hidden-gems", "needs-review", "popular-suspicious"]

export type RepoScoreOverrides = {
  difficulty?: Difficulty
  careerPaths?: CareerPath[]
  learningValue?: number      // 1-100
  contributionValue?: number  // 1-100
  careerSignal?: number       // 1-100
}

export type RepoCuration = {
  featured?: boolean
  hidden?: { reason: HideReason; note?: string; at: string }
  note?: string // curator note, shown alongside the repo
  overrides?: RepoScoreOverrides
  /** Per-queue review state; approved items leave the queue but stay recorded. */
  queue?: Partial<Record<QueueId, "approved" | "dismissed">>
  updatedAt?: string
}

export type JobCuration = {
  hidden?: { reason: string; at: string }
  duplicateOf?: string // href of the canonical job
  path?: CareerPath    // corrected detected career path
  skills?: string[]    // corrected detected skills
  updatedAt?: string
}

export type CompanyCuration = {
  featured?: boolean
  updatedAt?: string
}

// ── Admin repo rows ───────────────────────────────────────────────────────────

export type AdminRepoRow = {
  slug: string // "owner/name" - the curation key
  name: string
  owner: string
  eco: string
  href: string
  note: string
  stars: number
  forks: number
  openIssues: number
  language: string | null
  license: string | null
  kind: "code" | "reference"
  activityTier: "active" | "maintenance" | "dormant"
  pushedAt: string | null
  ecosystems: string[]
  depCount: number
  /** Tier-2 classification confidence, 0-1; null when never classified. */
  confidence: number | null
  domain: string | null
  companyBacked: boolean
  /** Metadata the pipeline should have produced but didn't. */
  missing: string[]
  /** High stars but weak engineering signals - deserves a human look. */
  suspicious: boolean
  curation: RepoCuration | null
}

const DAY = 24 * 60 * 60 * 1000

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / DAY)
}

// ── Dashboard aggregates ──────────────────────────────────────────────────────

export type CorpusHealth = {
  total: number
  active: number
  stale: number     // dormant, or no push in 180+ days
  hidden: number
  featured: number
}

export type QualitySummary = {
  suspicious: number
  missingMetadata: number
  lowConfidence: number   // classified below 0.35
  unclassified: number
  avgConfidence: number | null
}

export function computeCorpusHealth(rows: AdminRepoRow[]): CorpusHealth {
  let active = 0, stale = 0, hidden = 0, featured = 0
  for (const r of rows) {
    if (r.curation?.hidden) hidden++
    if (r.curation?.featured) featured++
    if (r.activityTier === "active") active++
    const age = daysSince(r.pushedAt)
    if (r.activityTier === "dormant" || (age !== null && age > 180)) stale++
  }
  return { total: rows.length, active, stale, hidden, featured }
}

export function computeQuality(rows: AdminRepoRow[]): QualitySummary {
  let suspicious = 0, missingMetadata = 0, lowConfidence = 0, unclassified = 0
  let confSum = 0, confN = 0
  for (const r of rows) {
    if (r.suspicious) suspicious++
    if (r.missing.length > 0) missingMetadata++
    if (r.confidence === null) unclassified++
    else {
      confSum += r.confidence
      confN++
      if (r.confidence < 0.35) lowConfidence++
    }
  }
  return {
    suspicious,
    missingMetadata,
    lowConfidence,
    unclassified,
    avgConfidence: confN > 0 ? confSum / confN : null,
  }
}

// ── Curation queues ───────────────────────────────────────────────────────────
// Deterministic review worklists computed from signals already on the corpus.
// A repo leaves a queue when a human approves or dismisses it there (recorded
// in curation.queue), or when it is hidden or featured outright.

export type QueueItem = {
  repo: AdminRepoRow
  why: string // one-line explanation of the signal that flagged it
}

export type Queues = Record<QueueId, QueueItem[]>

export const QUEUE_META: Record<QueueId, { label: string; description: string }> = {
  "rising": {
    label: "Rising",
    description: "Low stars but fresh, active, and well-classified - candidates before the crowd finds them",
  },
  "hidden-gems": {
    label: "Hidden gems",
    description: "Strong quality signals with little attention - high classification confidence, licensed, documented",
  },
  "needs-review": {
    label: "Needs review",
    description: "Conflicting or weak signals - the classifier is unsure or metadata contradicts itself",
  },
  "popular-suspicious": {
    label: "Popular but suspicious",
    description: "High stars, weak engineering signals - star count may overstate real value",
  },
}

function inQueue(r: AdminRepoRow, q: QueueId): boolean {
  if (r.curation?.hidden || r.curation?.featured) return false
  const state = r.curation?.queue?.[q]
  return state !== "approved" && state !== "dismissed"
}

export function buildQueues(rows: AdminRepoRow[]): Queues {
  const rising: QueueItem[] = []
  const gems: QueueItem[] = []
  const review: QueueItem[] = []
  const suspicious: QueueItem[] = []

  for (const r of rows) {
    const age = daysSince(r.pushedAt)
    const conf = r.confidence

    if (
      inQueue(r, "rising") &&
      r.stars < 300 && r.activityTier === "active" &&
      age !== null && age <= 30 &&
      conf !== null && conf >= 0.6 && r.missing.length === 0
    ) {
      rising.push({ repo: r, why: `${r.stars}★ but pushed ${age}d ago, confidence ${conf.toFixed(2)}` })
    }

    if (
      inQueue(r, "hidden-gems") &&
      r.stars < 500 && r.activityTier !== "dormant" &&
      conf !== null && conf >= 0.8 && r.license !== null &&
      r.note.trim().length > 0 && r.depCount >= 5
    ) {
      gems.push({ repo: r, why: `confidence ${conf.toFixed(2)}, ${r.depCount} deps, ${r.license} - only ${r.stars}★` })
    }

    if (inQueue(r, "needs-review")) {
      const reasons: string[] = []
      if (conf !== null && conf < 0.35) reasons.push(`classification confidence ${conf.toFixed(2)}`)
      if (r.missing.length >= 3) reasons.push(`missing ${r.missing.join(", ")}`)
      if (r.activityTier === "active" && age !== null && age > 90) reasons.push(`tier "active" but last push ${age}d ago`)
      if (r.activityTier === "dormant" && age !== null && age <= 14) reasons.push(`tier "dormant" but pushed ${age}d ago`)
      if (reasons.length > 0) review.push({ repo: r, why: reasons.join("; ") })
    }

    if (inQueue(r, "popular-suspicious") && r.suspicious) {
      const parts: string[] = [`${r.stars.toLocaleString()}★`]
      if (r.activityTier === "dormant") parts.push("dormant")
      if (!r.license) parts.push("no license")
      if (conf !== null && conf < 0.3) parts.push(`confidence ${conf.toFixed(2)}`)
      if (conf === null) parts.push("unclassified")
      suspicious.push({ repo: r, why: parts.join(", ") })
    }
  }

  // Most actionable first.
  rising.sort((a, b) => Date.parse(b.repo.pushedAt ?? "0") - Date.parse(a.repo.pushedAt ?? "0"))
  gems.sort((a, b) => (b.repo.confidence ?? 0) - (a.repo.confidence ?? 0))
  review.sort((a, b) => (a.repo.confidence ?? 1) - (b.repo.confidence ?? 1))
  suspicious.sort((a, b) => b.repo.stars - a.repo.stars)

  return { "rising": rising, "hidden-gems": gems, "needs-review": review, "popular-suspicious": suspicious }
}
