/**
 * Guard for the override -> snapshot projection (lib/pipeline/snapshot.ts).
 * Pure functions, synthetic fixtures, no DB, no network. This is the part of
 * Overrides publishing that can be verified before the `overrides` table
 * exists in a given database - buildEcoOverridesFile/buildLifecycleEdgesFile
 * take plain {key, data} rows, the same shape listOverrides() returns.
 *
 * Run: tsx scripts/check-override-snapshot.ts
 */
import { buildEcoOverridesFile, buildLifecycleEdgesFile, serialize } from "@/lib/pipeline/snapshot"

let failed = 0
function assert(label: string, cond: boolean) { if (!cond) { console.error(`x ${label}`); failed++ } }

// ── Eco-tag overrides: lookup map projection ────────────────────────────────
{
  const rows = [
    { key: "tokio-rs/axum", data: ["axum"] },
    { key: "esp-rs/esp-hal", data: ["embedded"] },
    { key: "diesel-rs/diesel", data: ["database", "wasm"] },
  ]
  const file = buildEcoOverridesFile(rows)
  assert("eco-overrides -> correct path", file.path === "content/eco-overrides.json")
  const parsed = JSON.parse(file.content)
  assert("eco-overrides -> every key present", Object.keys(parsed).length === 3)
  assert("eco-overrides -> value round-trips", JSON.stringify(parsed["diesel-rs/diesel"]) === JSON.stringify(["database", "wasm"]))
  assert("eco-overrides -> byte-identical for equal input", buildEcoOverridesFile(rows).content === file.content)
}

// Empty input -> empty object, not a crash, not "null".
{
  const file = buildEcoOverridesFile([])
  assert("eco-overrides -> empty rows produce {}", file.content.trim() === "{}")
}

// ── Lifecycle edges: relationship list projection ───────────────────────────
{
  const rows = [
    { key: "acquired_by:astral:openai", data: { edge_type: "acquired_by", from_slug: "astral", to_slug: "openai", effective_date: "2026-03-19", source: "https://openai.com/index/openai-to-acquire-astral/" } },
    { key: "acquired_by:bun:anthropic", data: { edge_type: "acquired_by", from_slug: "bun", to_slug: "anthropic", effective_date: "2025-12-02", source: "https://bun.com/blog/bun-joins-anthropic" } },
  ]
  const file = buildLifecycleEdgesFile(rows)
  assert("lifecycle-edges -> correct path", file.path === "content/lifecycle-edges.json")
  const parsed = JSON.parse(file.content)
  assert("lifecycle-edges -> array of exactly the edge data (key dropped, not leaked)", parsed.length === 2 && parsed[0].edge_type === "acquired_by" && parsed[0].key === undefined)
  assert("lifecycle-edges -> byte-identical for equal input", buildLifecycleEdgesFile(rows).content === file.content)
}

// Empty input -> empty array, not a crash.
{
  const file = buildLifecycleEdgesFile([])
  assert("lifecycle-edges -> empty rows produce []", file.content.trim() === "[]")
}

// ── Determinism: canonical serialize() applies to override files too ────────
{
  const a = buildEcoOverridesFile([{ key: "b/b", data: ["wasm"] }, { key: "a/a", data: ["cli"] }])
  // JSON.stringify(Object.entries insertion order) - keys are NOT sorted by
  // buildEcoOverridesFile itself, but serialize() canonicalizes recursively,
  // so key order in the *object* is stable regardless of row order.
  const b = serialize(JSON.parse(a.content))
  assert("eco-overrides -> serialize() output is already canonical (idempotent)", a.content === b)
}

if (failed) { console.error(`\n${failed} assertion(s) failed`); process.exit(1) }
console.log("ok - override snapshot projection: correct shape, empty-safe, deterministic")
