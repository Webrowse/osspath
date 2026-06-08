import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import type { ContentType, PendingItem } from "./types"
import { CONTENT_FILES } from "./types"

const ROOT = process.cwd()

function ensureDir(filePath: string) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function readJSON<T>(filePath: string): T[] {
  const full = join(ROOT, filePath)
  if (!existsSync(full)) return []
  try {
    const raw = readFileSync(full, "utf-8").trim()
    if (!raw || raw === "") return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function writeJSON<T>(filePath: string, data: T[]) {
  const full = join(ROOT, filePath)
  ensureDir(full)
  writeFileSync(full, JSON.stringify(data, null, 2) + "\n", "utf-8")
}

// ── Pending ───────────────────────────────────────────────────────────────────

export function readPending(type: ContentType): PendingItem[] {
  return readJSON<PendingItem>(`data/pending/${CONTENT_FILES[type]}.json`)
}

export function writePending(type: ContentType, items: PendingItem[]) {
  writeJSON(`data/pending/${CONTENT_FILES[type]}.json`, items)
}

export function addPendingItems(type: ContentType, newItems: PendingItem[]) {
  const existing = readPending(type)
  const existingIds = new Set(existing.map((i) => i.id))
  const unique = newItems.filter((i) => !existingIds.has(i.id))
  writePending(type, [...existing, ...unique])
  return unique.length
}

// ── Rejected / archived ───────────────────────────────────────────────────────

export function readRejected(type: ContentType): PendingItem[] {
  return readJSON<PendingItem>(`data/rejected/${CONTENT_FILES[type]}.json`)
}

export function archiveItem(type: ContentType, item: PendingItem) {
  const existing = readRejected(type)
  writeJSON(`data/rejected/${CONTENT_FILES[type]}.json`, [...existing, item])
}

// ── Published content ─────────────────────────────────────────────────────────

export function readContent(type: ContentType): Record<string, unknown>[] {
  return readJSON<Record<string, unknown>>(`content/${CONTENT_FILES[type]}.json`)
}

export function writeContent(type: ContentType, items: Record<string, unknown>[]) {
  writeJSON(`content/${CONTENT_FILES[type]}.json`, items)
}

export function appendContent(type: ContentType, item: Record<string, unknown>) {
  const existing = readContent(type)
  writeContent(type, [...existing, item])
}

export function removeContent(type: ContentType, index: number) {
  const existing = readContent(type)
  writeContent(type, existing.filter((_, i) => i !== index))
}

// ── Counts (for sidebar badges) ──────────────────────────────────────────────

const ALL_TYPES: ContentType[] = ["jobs", "oss", "grants", "pulse", "events", "companies", "portals"]

export function getPendingCounts(): Record<ContentType, number> {
  return Object.fromEntries(
    ALL_TYPES.map((t) => [t, readPending(t).length])
  ) as Record<ContentType, number>
}

export function getPublishedCounts(): Record<ContentType, number> {
  return Object.fromEntries(
    ALL_TYPES.map((t) => [t, readContent(t).length])
  ) as Record<ContentType, number>
}
