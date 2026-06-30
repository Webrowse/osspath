import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import type { ContentType, PendingItem } from "./types"
import { CONTENT_FILES } from "./types"
import { prisma } from "@/lib/prisma"

const ROOT = process.cwd()

// ── JSON helpers (local dev only — Railway uses DB-exported JSON) ──────────────

function ensureDir(filePath: string) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function readJSONFile<T>(rel: string): T[] {
  const full = join(ROOT, rel)
  if (!existsSync(full)) return []
  try {
    const raw = readFileSync(full, "utf-8").trim()
    if (!raw) return []
    return JSON.parse(raw)
  } catch { return [] }
}

function writeJSONFile<T>(rel: string, data: T[]) {
  const full = join(ROOT, rel)
  ensureDir(full)
  writeFileSync(full, JSON.stringify(data, null, 2) + "\n", "utf-8")
}

// ── Pending (DB-backed) ───────────────────────────────────────────────────────

export async function readPending(type: ContentType): Promise<PendingItem[]> {
  const rows = await prisma.adminQueue.findMany({
    where: { type, status: "pending" },
    orderBy: { createdAt: "asc" },
  })
  return rows.map(rowToPendingItem)
}

export async function writePending(type: ContentType, items: PendingItem[]) {
  // Delete pending rows for this type that are no longer in the list
  const keepIds = items.map(i => i.id)
  await prisma.adminQueue.deleteMany({
    where: { type, status: "pending", id: { notIn: keepIds } },
  })
}

function normalizeUrl(u: string): string {
  try {
    const url = new URL(u)
    // strip trailing slash, lowercase host, drop www.
    return (url.hostname.replace(/^www\./, "") + url.pathname).replace(/\/+$/, "").toLowerCase()
  } catch { return u.toLowerCase().replace(/\/+$/, "") }
}

async function publishedHrefs(type: ContentType): Promise<Set<string>> {
  const rows = await prisma.contentItem.findMany({
    where: { type, href: { not: null } },
    select: { href: true, data: true },
  })
  const set = new Set<string>()
  for (const row of rows) {
    if (row.href) {
      set.add(row.href)
      set.add(normalizeUrl(row.href))
    }
    // Also check href inside the JSONB data field (catches items published before dual-write)
    const dataHref = String((row.data as Record<string, unknown>)?.href ?? "")
    if (dataHref) {
      set.add(dataHref)
      set.add(normalizeUrl(dataHref))
    }
  }
  return set
}

export async function readPendingUnpublished(type: ContentType): Promise<PendingItem[]> {
  const [all, published] = await Promise.all([readPending(type), publishedHrefs(type)])
  return all.filter(item => {
    const srcUrl = item.sourceUrl ?? ""
    const extHref = String((item.extracted as Record<string, unknown>)?.href ?? "")
    return (
      !published.has(srcUrl) &&
      !published.has(normalizeUrl(srcUrl)) &&
      (!extHref || (!published.has(extHref) && !published.has(normalizeUrl(extHref))))
    )
  })
}

export async function addPendingItems(type: ContentType, newItems: PendingItem[]): Promise<number> {
  const [existing, published] = await Promise.all([
    prisma.adminQueue.findMany({ where: { type }, select: { id: true, sourceUrl: true } }),
    publishedHrefs(type),
  ])
  const existingIds = new Set(existing.map(r => r.id))

  const unique = newItems.filter(i => {
    if (existingIds.has(i.id)) return false
    const srcUrl = i.sourceUrl ?? ""
    const extHref = String((i.extracted as Record<string, unknown>)?.href ?? "")
    if (published.has(srcUrl) || published.has(normalizeUrl(srcUrl))) return false
    if (extHref && (published.has(extHref) || published.has(normalizeUrl(extHref)))) return false
    return true
  })

  if (unique.length > 0) {
    await prisma.adminQueue.createMany({
      data: unique.map(pendingItemToRow),
      skipDuplicates: true,
    })
  }
  return unique.length
}

export async function archiveItem(type: ContentType, item: PendingItem) {
  await prisma.adminQueue.upsert({
    where: { id: item.id },
    create: { ...pendingItemToRow(item), status: item.status },
    update: { status: item.status },
  })
}

export async function readRejected(type: ContentType): Promise<PendingItem[]> {
  const rows = await prisma.adminQueue.findMany({
    where: { type, status: "rejected" },
    orderBy: { createdAt: "asc" },
  })
  return rows.map(rowToPendingItem)
}

// ── Published content (dual-write: DB + JSON) ─────────────────────────────────

export async function readContent(type: ContentType): Promise<Record<string, unknown>[]> {
  const rows = await prisma.contentItem.findMany({
    where: { type },
    orderBy: { createdAt: "asc" },
  })
  return rows.map(r => r.data as Record<string, unknown>)
}

export async function appendContent(type: ContentType, item: Record<string, unknown>) {
  const href = String(item.href ?? "") || null
  await prisma.contentItem.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { type, href, data: item as any },
  })
  const existing = readJSONFile<Record<string, unknown>>(`content/${CONTENT_FILES[type]}.json`)
  writeJSONFile(`content/${CONTENT_FILES[type]}.json`, [...existing, item])
}

export async function appendContentBatch(type: ContentType, items: Record<string, unknown>[]) {
  if (items.length === 0) return
  await prisma.contentItem.createMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: items.map(item => ({ type, href: String(item.href ?? "") || null, data: item as any })),
  })
  const existing = readJSONFile<Record<string, unknown>>(`content/${CONTENT_FILES[type]}.json`)
  writeJSONFile(`content/${CONTENT_FILES[type]}.json`, [...existing, ...items])
}

export async function writeContent(type: ContentType, items: Record<string, unknown>[]) {
  await prisma.contentItem.deleteMany({ where: { type } })
  if (items.length > 0) {
    await prisma.contentItem.createMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: items.map(item => ({ type, href: String(item.href ?? "") || null, data: item as any })),
    })
  }
  writeJSONFile(`content/${CONTENT_FILES[type]}.json`, items)
}

export async function removeContent(type: ContentType, index: number) {
  const rows = await prisma.contentItem.findMany({
    where: { type },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })
  const target = rows[index]
  if (target) await prisma.contentItem.delete({ where: { id: target.id } })
  const existing = readJSONFile<Record<string, unknown>>(`content/${CONTENT_FILES[type]}.json`)
  writeJSONFile(`content/${CONTENT_FILES[type]}.json`, existing.filter((_, i) => i !== index))
}

// ── Counts ────────────────────────────────────────────────────────────────────

const ALL_TYPES: ContentType[] = ["jobs", "oss", "grants", "pulse", "events", "companies", "portals"]

export async function getPendingCounts(): Promise<Record<ContentType, number>> {
  const rows = await prisma.adminQueue.groupBy({
    by: ["type"],
    where: { status: "pending" },
    _count: { id: true },
  })
  const map = Object.fromEntries(rows.map(r => [r.type, r._count.id]))
  return Object.fromEntries(ALL_TYPES.map(t => [t, map[t] ?? 0])) as Record<ContentType, number>
}

export async function getPublishedCounts(): Promise<Record<ContentType, number>> {
  const rows = await prisma.contentItem.groupBy({
    by: ["type"],
    _count: { id: true },
  })
  const map = Object.fromEntries(rows.map(r => [r.type, r._count.id]))
  return Object.fromEntries(ALL_TYPES.map(t => [t, map[t] ?? 0])) as Record<ContentType, number>
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function rowToPendingItem(row: {
  id: string; type: string; status: string; source: string; sourceUrl: string;
  foundAt: string; confidence: number | null; rawText: string | null;
  extracted: unknown; whyMatched: string | null; score: number | null;
}): PendingItem {
  return {
    id: row.id,
    type: row.type as ContentType,
    status: row.status as PendingItem["status"],
    source: row.source,
    sourceUrl: row.sourceUrl,
    foundAt: row.foundAt,
    confidence: row.confidence ?? undefined,
    rawText: row.rawText ?? undefined,
    extracted: row.extracted as Record<string, unknown>,
    whyMatched: row.whyMatched ?? undefined,
    score: row.score ?? undefined,
  }
}

function pendingItemToRow(item: PendingItem) {
  return {
    id: item.id,
    type: item.type,
    status: item.status,
    source: item.source,
    sourceUrl: item.sourceUrl,
    foundAt: item.foundAt,
    confidence: item.confidence ?? null,
    rawText: item.rawText ?? null,
    extracted: item.extracted as object,
    whyMatched: item.whyMatched ?? null,
    score: item.score ?? null,
  }
}
