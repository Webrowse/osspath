#!/usr/bin/env node
/**
 * Creates all app tables (if missing) then seeds content from JSON files.
 * Safe to re-run — uses IF NOT EXISTS and upserts.
 * Run: node scripts/setup-db.mjs
 */
import { createRequire } from "module"
const require = createRequire(import.meta.url)
require("dotenv").config({ path: ".env.local" })
require("dotenv").config()

const { PrismaClient } = await import("@prisma/client")
const { PrismaPg } = await import("@prisma/adapter-pg")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ── 1. Create tables via the app's own connection ─────────────────────────────

console.log("Creating tables...")

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS content_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    href TEXT,
    data JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS content_items_type_idx ON content_items (type)`)
await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS content_items_type_href_idx ON content_items (type, href)`)

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS admin_queue (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    source TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "foundAt" TEXT NOT NULL,
    confidence DOUBLE PRECISION,
    "rawText" TEXT,
    extracted JSONB NOT NULL,
    "whyMatched" TEXT,
    score DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS admin_queue_type_status_idx ON admin_queue (type, status)`)

// Verify
const tables = await prisma.$queryRaw`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' ORDER BY table_name
`
console.log("Tables:", tables.map(r => r.table_name).join(", "))

// ── 2. Seed content from JSON files ──────────────────────────────────────────

const { readFileSync, existsSync } = await import("fs")
const { join } = await import("path")
const ROOT = process.cwd()

function readJSON(rel) {
  const full = join(ROOT, rel)
  if (!existsSync(full)) return []
  try { return JSON.parse(readFileSync(full, "utf-8")) } catch { return [] }
}

const TYPES = ["jobs", "oss", "grants", "pulse", "events", "companies", "portals", "news"]

console.log("\nSeeding content...")
let total = 0
for (const type of TYPES) {
  const items = readJSON(`content/${type}.json`)
  if (items.length === 0) { console.log(`  ${type}: empty, skipping`); continue }
  await prisma.contentItem.deleteMany({ where: { type } })
  for (let i = 0; i < items.length; i += 500) {
    await prisma.contentItem.createMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: items.slice(i, i + 500).map((item) => ({ id: `${type}-${i + Math.random().toString(36).slice(2)}`, type, href: String(item.href ?? "") || null, data: item as any }))
    })
  }
  console.log(`  ✓ ${type}: ${items.length}`)
  total += items.length
}

console.log("\nSeeding admin queue (rejected history)...")
let qTotal = 0
for (const type of TYPES) {
  const items = readJSON(`data/rejected/${type}.json`)
  if (items.length === 0) continue
  for (const item of items) {
    await prisma.adminQueue.upsert({
      where: { id: item.id },
      create: { id: item.id, type: item.type ?? type, status: "rejected", source: item.source ?? "unknown", sourceUrl: item.sourceUrl ?? "", foundAt: item.foundAt ?? new Date().toISOString(), confidence: item.confidence ?? null, rawText: item.rawText ?? null, extracted: item.extracted ?? {}, whyMatched: item.whyMatched ?? null, score: item.score ?? null },
      update: { status: "rejected" },
    })
    qTotal++
  }
  console.log(`  ✓ rejected/${type}: ${items.length}`)
}

console.log(`\n✓ Setup complete — ${total} content items, ${qTotal} queue history items`)
await prisma.$disconnect()
