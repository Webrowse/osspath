/**
 * Guard for Tier 2 relationship algorithms (lib/pipeline/corpus/{similarity,companions}).
 * Pure functions, synthetic fixtures, no DB, no network. Run: tsx scripts/check-corpus-relationships.ts
 */
import { computeSimilarity } from "@/lib/pipeline/corpus/similarity"
import { buildCompanionIndex, companionsForRepo } from "@/lib/pipeline/corpus/companions"

let failed = 0
function eq(label: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g !== w) { console.error(`x ${label}\n    got:  ${g}\n    want: ${w}`); failed++ }
}
function assert(label: string, cond: boolean) { if (!cond) { console.error(`x ${label}`); failed++ } }

// ── similarity ───────────────────────────────────────────────────────────────

// Two repos sharing a distinctive dep set should match each other; a repo with
// only ubiquitous deps (serde/tokio) contributes no signal and is excluded.
{
  const repos = [
    { slug: "a/one", dependencies: ["axum", "sqlx", "serde"] },
    { slug: "b/two", dependencies: ["axum", "sqlx", "tokio"] },
    { slug: "c/three", dependencies: ["serde", "tokio"] }, // ubiquitous-only -> no signal
    { slug: "d/four", dependencies: ["bevy", "glam"] },    // unrelated
  ]
  const sim = computeSimilarity(repos)
  assert("ubiquitous-only repo excluded", !sim.has("c/three"))
  assert("a/one matches b/two", (sim.get("a/one") ?? []).some((s) => s.repo === "b/two"))
  assert("a/one does not match unrelated d/four", !(sim.get("a/one") ?? []).some((s) => s.repo === "d/four"))
  const topMatch = (sim.get("a/one") ?? [])[0]
  assert("top match score in (0,1]", !!topMatch && topMatch.score > 0 && topMatch.score <= 1)
}

// Determinism: shuffled input order yields identical output (sorted internally).
{
  const repos = [
    { slug: "z/last", dependencies: ["axum", "sqlx"] },
    { slug: "a/first", dependencies: ["axum", "sqlx"] },
    { slug: "m/mid", dependencies: ["axum", "sqlx"] },
  ]
  const shuffled = [repos[2], repos[0], repos[1]]
  const a = computeSimilarity(repos)
  const b = computeSimilarity(shuffled)
  eq("similarity is order-independent", [...a.get("a/first") ?? []], [...b.get("a/first") ?? []])
}

// No dependencies -> no entries at all.
{
  const sim = computeSimilarity([{ slug: "x/empty", dependencies: [] }])
  assert("no deps -> not indexed", !sim.has("x/empty"))
}

// ── companions ───────────────────────────────────────────────────────────────

// axum+tower co-occur in >= MIN_REPOS(6) repos -> qualify and pair up.
{
  const repos = Array.from({ length: 6 }, (_, i) => ({
    slug: `owner/repo${i}`,
    dependencies: ["axum", "tower"],
  }))
  const index = buildCompanionIndex(repos)
  assert("axum qualifies at 6 repos", index.has("axum"))
  const axumCompanions = index.get("axum") ?? []
  assert("axum's top companion is tower", axumCompanions[0]?.name === "tower")
  eq("tower appears in 100% of axum's repos", axumCompanions[0]?.percent, 100)
}

// A crate under MIN_REPOS does not qualify for the corpus index.
{
  const repos = [
    { slug: "a/one", dependencies: ["raredep", "axum"] },
    { slug: "b/two", dependencies: ["raredep"] },
  ]
  const index = buildCompanionIndex(repos)
  assert("under-threshold crate excluded", !index.has("raredep"))
}

// Per-repo projection excludes crates the repo already depends on.
{
  const repos = Array.from({ length: 6 }, (_, i) => ({
    slug: `owner/repo${i}`,
    dependencies: ["axum", "tower", "hyper"],
  }))
  const index = buildCompanionIndex(repos)
  const projected = companionsForRepo(["axum"], index) // repo depends only on axum
  assert("projection includes tower (companion of axum)", projected.some((c) => c.name === "tower"))
  assert("projection never includes axum itself", !projected.some((c) => c.name === "axum"))
}

if (failed) { console.error(`\n${failed} assertion(s) failed`); process.exit(1) }
console.log("ok - corpus relationships: similarity + companion algorithms are correct and deterministic")
