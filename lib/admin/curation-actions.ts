"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "./require-admin"
import { upsertOverride, deleteOverride, listOverrides } from "./overrides"
import { recordAudit } from "./audit"
import {
  HIDE_REASONS, DIFFICULTIES, CAREER_PATHS, QUEUE_IDS,
  type HideReason, type QueueId, type RepoCuration, type RepoScoreOverrides,
  type JobCuration, type CompanyCuration, type CareerPath,
} from "./curation"

/**
 * Curation server actions. Every mutation follows the same discipline:
 *   1. requireAdmin()
 *   2. validate the payload
 *   3. merge into the item's override row (raw pipeline data is never touched)
 *   4. append an audit_log entry recording what changed and why
 *
 * Overrides whose every field has been cleared are deleted outright, so an
 * absent row always means "pure machine output".
 */

const ADMIN_PATHS = ["/admin", "/admin/repos", "/admin/queue", "/admin/jobs", "/admin/audit"]

function revalidateAdmin() {
  for (const p of ADMIN_PATHS) revalidatePath(p)
}

function assertSlug(slug: string): string {
  const s = slug.trim()
  if (!s.includes("/")) throw new Error(`Repo slug must be "owner/repo", got: ${s}`)
  return s
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) throw new Error(`Score must be a number 1-100, got: ${n}`)
  return Math.min(100, Math.max(1, Math.round(n)))
}

// ── Repo curation ─────────────────────────────────────────────────────────────

async function readRepoCuration(slug: string): Promise<RepoCuration> {
  const rows = await listOverrides("repo-curation")
  return (rows.find((r) => r.key === slug)?.data as RepoCuration) ?? {}
}

function isEmptyCuration(c: RepoCuration): boolean {
  return !c.featured && !c.hidden && !c.note &&
    (!c.overrides || Object.keys(c.overrides).length === 0) &&
    (!c.queue || Object.keys(c.queue).length === 0)
}

async function writeRepoCuration(slug: string, next: RepoCuration): Promise<void> {
  if (isEmptyCuration(next)) {
    await deleteOverride("repo-curation", slug)
  } else {
    await upsertOverride("repo-curation", slug, { ...next, updatedAt: new Date().toISOString() })
  }
}

export async function featureRepo(slug: string, featured: boolean, reason?: string) {
  await requireAdmin()
  const key = assertSlug(slug)
  const cur = await readRepoCuration(key)
  const next: RepoCuration = { ...cur, featured: featured || undefined }
  if (featured) delete next.hidden // featuring un-hides
  await writeRepoCuration(key, next)
  await recordAudit({
    action: featured ? "repo.feature" : "repo.unfeature",
    target: key,
    changes: { featured: { from: !!cur.featured, to: featured } },
    reason,
  })
  revalidateAdmin()
}

export async function hideRepo(slug: string, hideReason: HideReason, note?: string) {
  await requireAdmin()
  const key = assertSlug(slug)
  if (!HIDE_REASONS.includes(hideReason)) throw new Error(`Unknown hide reason: ${hideReason}`)
  const cur = await readRepoCuration(key)
  const next: RepoCuration = {
    ...cur,
    featured: undefined,
    hidden: { reason: hideReason, note: note?.trim() || undefined, at: new Date().toISOString() },
  }
  await writeRepoCuration(key, next)
  await recordAudit({
    action: "repo.hide",
    target: key,
    changes: { hidden: { from: cur.hidden ?? null, to: next.hidden } },
    reason: note || hideReason,
  })
  revalidateAdmin()
}

export async function unhideRepo(slug: string, reason?: string) {
  await requireAdmin()
  const key = assertSlug(slug)
  const cur = await readRepoCuration(key)
  if (!cur.hidden) return
  const next: RepoCuration = { ...cur }
  delete next.hidden
  await writeRepoCuration(key, next)
  await recordAudit({
    action: "repo.unhide",
    target: key,
    changes: { hidden: { from: cur.hidden, to: null } },
    reason,
  })
  revalidateAdmin()
}

export async function setRepoNote(slug: string, note: string) {
  await requireAdmin()
  const key = assertSlug(slug)
  const cur = await readRepoCuration(key)
  const trimmed = note.trim()
  const next: RepoCuration = { ...cur, note: trimmed || undefined }
  await writeRepoCuration(key, next)
  await recordAudit({
    action: "repo.note",
    target: key,
    changes: { note: { from: cur.note ?? null, to: trimmed || null } },
  })
  revalidateAdmin()
}

export async function setRepoOverrides(slug: string, overrides: RepoScoreOverrides, reason?: string) {
  await requireAdmin()
  const key = assertSlug(slug)

  const clean: RepoScoreOverrides = {}
  if (overrides.difficulty !== undefined) {
    if (!DIFFICULTIES.includes(overrides.difficulty)) throw new Error(`Unknown difficulty: ${overrides.difficulty}`)
    clean.difficulty = overrides.difficulty
  }
  if (overrides.careerPaths !== undefined) {
    const bad = overrides.careerPaths.filter((p) => !CAREER_PATHS.includes(p))
    if (bad.length > 0) throw new Error(`Unknown career path(s): ${bad.join(", ")}`)
    if (overrides.careerPaths.length > 0) clean.careerPaths = overrides.careerPaths
  }
  if (overrides.learningValue !== undefined) clean.learningValue = clamp100(overrides.learningValue)
  if (overrides.contributionValue !== undefined) clean.contributionValue = clamp100(overrides.contributionValue)
  if (overrides.careerSignal !== undefined) clean.careerSignal = clamp100(overrides.careerSignal)

  const cur = await readRepoCuration(key)
  const next: RepoCuration = {
    ...cur,
    overrides: Object.keys(clean).length > 0 ? clean : undefined,
  }
  await writeRepoCuration(key, next)
  await recordAudit({
    action: "repo.override",
    target: key,
    changes: { overrides: { from: cur.overrides ?? null, to: next.overrides ?? null } },
    reason,
  })
  revalidateAdmin()
}

export async function setQueueState(slug: string, queue: QueueId, state: "approved" | "dismissed", reason?: string) {
  await requireAdmin()
  const key = assertSlug(slug)
  if (!QUEUE_IDS.includes(queue)) throw new Error(`Unknown queue: ${queue}`)
  const cur = await readRepoCuration(key)
  const next: RepoCuration = { ...cur, queue: { ...cur.queue, [queue]: state } }
  await writeRepoCuration(key, next)
  await recordAudit({
    action: `queue.${state === "approved" ? "approve" : "dismiss"}`,
    target: key,
    changes: { queue, state },
    reason,
  })
  revalidateAdmin()
}

// ── Bulk repo actions ─────────────────────────────────────────────────────────
// Sequential on purpose: tens of rows, and each write is an upsert + audit
// entry. One audit entry per repo keeps the trail queryable per target.

export async function bulkHideRepos(slugs: string[], hideReason: HideReason, reason?: string) {
  await requireAdmin()
  for (const slug of slugs) await hideRepo(slug, hideReason, reason)
}

export async function bulkFeatureRepos(slugs: string[], reason?: string) {
  await requireAdmin()
  for (const slug of slugs) await featureRepo(slug, true, reason)
}

export async function bulkClearCuration(slugs: string[], reason?: string) {
  await requireAdmin()
  for (const slug of slugs) {
    const key = assertSlug(slug)
    const cur = await readRepoCuration(key)
    if (isEmptyCuration(cur)) continue
    await deleteOverride("repo-curation", key)
    await recordAudit({ action: "repo.clear", target: key, changes: { cleared: cur }, reason })
  }
  revalidateAdmin()
}

// ── Job curation ──────────────────────────────────────────────────────────────

async function readJobCuration(href: string): Promise<JobCuration> {
  const rows = await listOverrides("job-curation")
  return (rows.find((r) => r.key === href)?.data as JobCuration) ?? {}
}

function isEmptyJobCuration(c: JobCuration): boolean {
  return !c.hidden && !c.duplicateOf && !c.path && (!c.skills || c.skills.length === 0)
}

async function writeJobCuration(href: string, next: JobCuration): Promise<void> {
  if (isEmptyJobCuration(next)) {
    await deleteOverride("job-curation", href)
  } else {
    await upsertOverride("job-curation", href, { ...next, updatedAt: new Date().toISOString() })
  }
}

export async function hideJob(href: string, reason: string) {
  await requireAdmin()
  const key = href.trim()
  if (!key) throw new Error("Job href required")
  const cur = await readJobCuration(key)
  const next: JobCuration = { ...cur, hidden: { reason: reason.trim() || "hidden", at: new Date().toISOString() } }
  await writeJobCuration(key, next)
  await recordAudit({ action: "job.hide", target: key, changes: { hidden: next.hidden }, reason })
  revalidateAdmin()
}

export async function unhideJob(href: string, reason?: string) {
  await requireAdmin()
  const key = href.trim()
  const cur = await readJobCuration(key)
  if (!cur.hidden) return
  const next: JobCuration = { ...cur }
  delete next.hidden
  await writeJobCuration(key, next)
  await recordAudit({ action: "job.unhide", target: key, changes: { hidden: { from: cur.hidden, to: null } }, reason })
  revalidateAdmin()
}

export async function markJobDuplicate(href: string, duplicateOf: string, reason?: string) {
  await requireAdmin()
  const key = href.trim()
  const canonical = duplicateOf.trim()
  if (!key || !canonical) throw new Error("Both job hrefs are required")
  if (key === canonical) throw new Error("A job cannot duplicate itself")
  const cur = await readJobCuration(key)
  const next: JobCuration = { ...cur, duplicateOf: canonical }
  await writeJobCuration(key, next)
  await recordAudit({ action: "job.duplicate", target: key, changes: { duplicateOf: canonical }, reason })
  revalidateAdmin()
}

export async function clearJobDuplicate(href: string, reason?: string) {
  await requireAdmin()
  const key = href.trim()
  const cur = await readJobCuration(key)
  if (!cur.duplicateOf) return
  const next: JobCuration = { ...cur }
  delete next.duplicateOf
  await writeJobCuration(key, next)
  await recordAudit({ action: "job.duplicate-clear", target: key, changes: { duplicateOf: { from: cur.duplicateOf, to: null } }, reason })
  revalidateAdmin()
}

export async function setJobIntelligence(
  href: string,
  intel: { path?: CareerPath | null; skills?: string[] | null },
  reason?: string,
) {
  await requireAdmin()
  const key = href.trim()
  if (!key) throw new Error("Job href required")
  if (intel.path && !CAREER_PATHS.includes(intel.path)) throw new Error(`Unknown career path: ${intel.path}`)

  const cur = await readJobCuration(key)
  const next: JobCuration = { ...cur }
  if (intel.path !== undefined) {
    if (intel.path === null) delete next.path
    else next.path = intel.path
  }
  if (intel.skills !== undefined) {
    const cleaned = (intel.skills ?? []).map((s) => s.trim()).filter(Boolean)
    if (cleaned.length === 0) delete next.skills
    else next.skills = cleaned
  }
  await writeJobCuration(key, next)
  await recordAudit({
    action: "job.intelligence",
    target: key,
    changes: {
      path: { from: cur.path ?? null, to: next.path ?? null },
      skills: { from: cur.skills ?? null, to: next.skills ?? null },
    },
    reason,
  })
  revalidateAdmin()
}

// ── Company curation ──────────────────────────────────────────────────────────

export async function featureCompany(slug: string, featured: boolean, reason?: string) {
  await requireAdmin()
  const key = slug.trim().toLowerCase()
  if (!key) throw new Error("Company slug required")
  if (featured) {
    const data: CompanyCuration = { featured: true, updatedAt: new Date().toISOString() }
    await upsertOverride("company-curation", key, data)
  } else {
    await deleteOverride("company-curation", key)
  }
  await recordAudit({
    action: featured ? "company.feature" : "company.unfeature",
    target: key,
    changes: { featured },
    reason,
  })
  revalidateAdmin()
}
