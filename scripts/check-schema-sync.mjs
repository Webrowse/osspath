#!/usr/bin/env node
/**
 * Build-time guardrail: verify the live database matches the current application
 * schema, to prevent deploying against an incompatible database (e.g. one
 * applied from a stale checkout).
 *
 * Uses `prisma migrate diff --exit-code` (structural, authoritative — it checks
 * actual tables/columns, so it cannot be fooled by a missing fingerprint):
 *   exit 0 = in sync, exit 2 = drift, exit 1 = error (DB unreachable).
 *
 * Production (Railway/CI) fails closed on any mismatch. Local builds only warn
 * and continue, so development is never blocked by a schema that's out of sync.
 * Fix a mismatch with:  npm run db:sync-schema
 */
import { spawnSync } from "child_process"

const isProduction = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.CI)

const res = spawnSync(
  "npx",
  ["prisma", "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code"],
  { encoding: "utf8" },
)

if (res.status === 0) {
  console.log("✓ schema-sync: database matches the application schema")
  process.exit(0)
}

// Not in sync (drift or error) — describe it.
if (res.status === 2) {
  console.error("schema-sync: database schema does NOT match the application.")
  console.error("  The live database differs from prisma/schema.prisma at this checkout.")
  const sql = (res.stdout || "").trim()
  if (sql) console.error(sql.split("\n").map((l) => "    " + l).join("\n"))
} else {
  console.error("schema-sync: could not verify schema (database unreachable?).")
  console.error("  " + ((res.stderr || res.stdout || "").split("\n").find(Boolean) ?? "unknown error"))
}

if (isProduction) {
  console.error("✗ Failing the production build. Fix with: npm run db:sync-schema (from an up-to-date checkout).")
  process.exit(1)
}

console.warn("⚠ Local build: continuing despite schema mismatch. Run  npm run db:sync-schema  to fix.")
process.exit(0)
