#!/usr/bin/env node
/**
 * Build-time guardrail: fail the build if the live database does not match the
 * current application schema. Prevents deploying an app against an incompatible
 * database (e.g. one applied from a stale checkout).
 *
 * Uses `prisma migrate diff --exit-code` (structural, authoritative — it checks
 * actual tables/columns, so it cannot be fooled by a missing fingerprint).
 *   exit 0 = in sync, exit 2 = drift, exit 1 = error (DB unreachable).
 * Any non-zero result fails the build (fail-closed).
 */
import { spawnSync } from "child_process"

const res = spawnSync(
  "npx",
  ["prisma", "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code"],
  { encoding: "utf8" },
)

if (res.status === 0) {
  console.log("✓ schema-sync: database matches the application schema")
  process.exit(0)
}

if (res.status === 2) {
  console.error("✗ schema-sync: DATABASE SCHEMA DOES NOT MATCH the application.")
  console.error("  The live database differs from prisma/schema.prisma at this checkout.")
  console.error("  Most likely a `prisma db push` was run from a different/stale checkout.")
  console.error("  Fix: from a clean, up-to-date checkout, run  npm run db:apply")
  const sql = (res.stdout || "").trim()
  if (sql) console.error("\n  Pending changes:\n" + sql.split("\n").map((l) => "    " + l).join("\n"))
  process.exit(1)
}

console.error("✗ schema-sync: could not verify schema (database unreachable?).")
console.error("  " + ((res.stderr || res.stdout || "").split("\n").find(Boolean) ?? "unknown error"))
process.exit(1)
