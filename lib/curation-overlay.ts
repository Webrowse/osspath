import "server-only"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

/**
 * Public reader for the human curation overlay (content/curation.json),
 * published from Postgres alongside the content snapshots. Raw pipeline data
 * never carries human judgment; this file layers it on: hidden repos leave
 * public surfaces, featured/overridden repos rank up in route selection.
 *
 * The file appears with the first publish after the admin control center
 * ships - absence is normal and means "no human decisions yet".
 */

export type RepoCurationOverlay = {
  featured?: boolean
  hidden?: { reason: string; note?: string; at: string }
  note?: string
  overrides?: {
    difficulty?: "beginner" | "intermediate" | "advanced"
    careerPaths?: string[]
    learningValue?: number
    contributionValue?: number
    careerSignal?: number
  }
}

export type CurationOverlay = {
  repos: Record<string, RepoCurationOverlay>
  jobs: Record<string, unknown>
  companies: Record<string, unknown>
}

const EMPTY: CurationOverlay = { repos: {}, jobs: {}, companies: {} }

let _overlay: CurationOverlay | null = null

export function getCurationOverlay(): CurationOverlay {
  if (_overlay) return _overlay
  const full = join(process.cwd(), "content/curation.json")
  if (!existsSync(full)) return (_overlay = EMPTY)
  try {
    const parsed = JSON.parse(readFileSync(full, "utf-8"))
    _overlay = {
      repos: parsed.repos ?? {},
      jobs: parsed.jobs ?? {},
      companies: parsed.companies ?? {},
    }
  } catch {
    _overlay = EMPTY
  }
  return _overlay
}

/** Curation for one repo by "owner/name" slug. */
export function getRepoOverlay(slug: string): RepoCurationOverlay | undefined {
  return getCurationOverlay().repos[slug]
}
