import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import type { ContentType } from "./types"
import { CONTENT_SCHEMA, CONTENT_TYPES } from "./content-schema"
import { prisma } from "@/lib/prisma"

const ROOT = process.cwd()

// ── JSON helpers ──────────────────────────────────────────────────────────────
// PostgreSQL is the source of truth. The local content/*.json mirror keeps dev
// in sync after admin edits; the build re-exports it from the DB.

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

// ── Published content ─────────────────────────────────────────────────────────

export async function readContent(type: ContentType): Promise<Record<string, unknown>[]> {
  const rows = await prisma.contentItem.findMany({ where: { type }, orderBy: { createdAt: "asc" } })
  return rows.map((r) => r.data as Record<string, unknown>)
}

export async function writeContent(type: ContentType, items: Record<string, unknown>[]) {
  await prisma.contentItem.deleteMany({ where: { type } })
  if (items.length > 0) {
    await prisma.contentItem.createMany({
      data: items.map((item) => ({ type, href: String(item.href ?? "") || null, data: item as never })),
    })
  }
  writeJSONFile(`content/${CONTENT_SCHEMA[type].file}.json`, items)
}

export async function removeContent(type: ContentType, index: number) {
  const rows = await prisma.contentItem.findMany({
    where: { type },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })
  const target = rows[index]
  if (target) await prisma.contentItem.delete({ where: { id: target.id } })
  const existing = readJSONFile<Record<string, unknown>>(`content/${CONTENT_SCHEMA[type].file}.json`)
  writeJSONFile(`content/${CONTENT_SCHEMA[type].file}.json`, existing.filter((_, i) => i !== index))
}

// ── Counts ────────────────────────────────────────────────────────────────────

export async function getPublishedCounts(): Promise<Record<ContentType, number>> {
  const rows = await prisma.contentItem.groupBy({ by: ["type"], _count: { id: true } })
  const map = Object.fromEntries(rows.map((r) => [r.type, r._count.id]))
  return Object.fromEntries(CONTENT_TYPES.map((t) => [t, map[t] ?? 0])) as Record<ContentType, number>
}
