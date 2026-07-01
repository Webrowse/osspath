#!/usr/bin/env node
/**
 * Export published content from PostgreSQL to content/*.json.
 *
 * Runs as the first prebuild step so the static site is built from fresh DB
 * data. The scanner-generated dataset lives only in PostgreSQL and is not
 * committed to git; this script materialises it into the JSON files the public
 * pages import at build time.
 *
 * Fail-closed: if the database is unreachable or any type fails to load, the
 * script exits non-zero WITHOUT writing any file. A failed export fails the
 * build, leaving the previously deployed site serving traffic untouched. It
 * never emits partial or empty content.
 *
 * Run: node scripts/export-db-to-json.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from "fs"
import { join } from "path"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
require("dotenv").config({ path: ".env.local" })
require("dotenv").config()

// Scanner-generated content types. Each maps to content/<name>.json.
const TYPES = ["jobs", "oss", "grants", "pulse", "events", "companies", "portals", "news"]

const ROOT = process.cwd()
const CONTENT_DIR = join(ROOT, "content")

if (!process.env.DATABASE_URL) {
  console.error("✗ export-db-to-json: DATABASE_URL is not set. Aborting (no files written).")
  process.exit(1)
}

const { PrismaClient } = await import("@prisma/client")
const { PrismaPg } = await import("@prisma/adapter-pg")

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

// Phase 1: load everything into memory. Any failure aborts before writing.
const buffered = {}
try {
  for (const type of TYPES) {
    const rows = await prisma.contentItem.findMany({
      where: { type },
      orderBy: { createdAt: "asc" },
    })
    buffered[type] = rows.map((r) => r.data)
  }
} catch (err) {
  console.error(`✗ export-db-to-json: failed reading from DB (no files written): ${err?.message ?? err}`)
  await prisma.$disconnect()
  process.exit(1)
} finally {
  await prisma.$disconnect()
}

// Phase 2: all types loaded successfully — write them out.
if (!existsSync(CONTENT_DIR)) mkdirSync(CONTENT_DIR, { recursive: true })

let total = 0
for (const type of TYPES) {
  const items = buffered[type]
  writeFileSync(join(CONTENT_DIR, `${type}.json`), JSON.stringify(items, null, 2) + "\n", "utf-8")
  console.log(`  ✓ ${type}: ${items.length} → content/${type}.json`)
  total += items.length
}

console.log(`\n✓ Exported ${total} items across ${TYPES.length} types from DB to content/`)
