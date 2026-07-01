#!/usr/bin/env node
/**
 * INV-1 guard: the public render path must never import PostgreSQL or auth.
 *
 * The public website is fully static and must generate zero database queries
 * for visitors. PostgreSQL is reachable only from the Refresh pipeline and the
 * build-time export. This guard fails the build if any route under app/
 * (except app/admin/** and app/api/auth/**) imports @/lib/prisma, @/lib/auth,
 * or anything under @/lib/admin.
 *
 * Run: node scripts/check-public-purity.mjs
 */
import { readdirSync, readFileSync, statSync } from "fs"
import { join, relative } from "path"

const ROOT = process.cwd()
const APP_DIR = join(ROOT, "app")

// Routes allowed to touch DB/auth: the admin surface and the NextAuth handler.
const ALLOWED_PREFIXES = [join("app", "admin"), join("app", "api", "auth")]

// Import specifiers that must not appear in the public render path.
const FORBIDDEN = /from\s+["']@\/lib\/(prisma|auth|admin(?:\/[^"']+)?)["']/

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

const violations = []
for (const file of walk(APP_DIR)) {
  const rel = relative(ROOT, file)
  if (ALLOWED_PREFIXES.some((p) => rel.startsWith(p))) continue

  const src = readFileSync(file, "utf-8")
  const m = src.match(FORBIDDEN)
  if (m) violations.push(`${rel}: imports ${m[0].replace(/from\s+/, "")}`)
}

if (violations.length > 0) {
  console.error("✗ public-purity: DB/auth imports found in the public render path:")
  for (const v of violations) console.error(`    ${v}`)
  console.error("\n  Public pages must stay static. Move DB/auth usage under app/admin or app/api/auth.")
  process.exit(1)
}

console.log("✓ public-purity: no DB/auth imports in the public render path")
