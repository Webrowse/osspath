/**
 * Guard for the backfill re-enrichment gate (lib/pipeline/backfill).
 * Pure functions, no DB. Run: tsx scripts/check-backfill-select.ts
 */
import { needsEnrichment, inFailureCooldown } from "@/lib/pipeline/backfill"
import { ENRICHMENT_VERSION as V } from "@/lib/pipeline/enrich"

let failed = 0
function assert(label: string, cond: boolean) { if (!cond) { console.error(`x ${label}`); failed++ } }

// needsEnrichment: version + pushedAt gate
assert("missing enrichment", needsEnrichment({ pushedAt: "p" }) === true)
assert("current+match -> no", needsEnrichment({ pushedAt: "p", enrichment: { version: V, sourcePushedAt: "p" } }) === false)
assert("stale version -> yes", needsEnrichment({ pushedAt: "p", enrichment: { version: V - 1, sourcePushedAt: "p" } }) === true)
assert("pushedAt changed -> yes", needsEnrichment({ pushedAt: "p2", enrichment: { version: V, sourcePushedAt: "p1" } }) === true)
assert("null pushedAt both -> no", needsEnrichment({ enrichment: { version: V, sourcePushedAt: null } }) === false)

// inFailureCooldown: 6h backoff window
const now = 1_000_000_000_000
assert("recent failure -> cooldown", inFailureCooldown({ enrichAttemptedAt: new Date(now - 1000).toISOString() }, now) === true)
assert("old failure -> no cooldown", inFailureCooldown({ enrichAttemptedAt: new Date(now - 7 * 3600_000).toISOString() }, now) === false)
assert("no failure -> no cooldown", inFailureCooldown({}, now) === false)

if (failed) { console.error(`\n${failed} assertion(s) failed`); process.exit(1) }
console.log("ok - backfill gate (version + pushedAt + cooldown) is correct")
