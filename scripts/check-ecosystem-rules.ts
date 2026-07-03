/**
 * Guard for the Ecosystem Intelligence rule engine (lib/pipeline/corpus/ecosystem-rules).
 * Pure function, synthetic fixtures, no DB, no network, no AI.
 * Run: tsx scripts/check-ecosystem-rules.ts
 */
import { inferEcosystem, type CargoSignals } from "@/lib/pipeline/corpus/ecosystem-rules"

let failed = 0
function assert(label: string, cond: boolean) { if (!cond) { console.error(`x ${label}`); failed++ } }

function signals(partial: Partial<CargoSignals>): CargoSignals {
  return { categories: [], keywords: [], dependencies: [], devDependencies: [], buildDependencies: [], ...partial }
}

// No signals at all -> empty, unclassified, zero confidence, explained.
{
  const r = inferEcosystem(signals({}))
  assert("no signal -> no ecosystems", r.ecosystems.length === 0)
  assert("no signal -> no domain", r.domain === null)
  assert("no signal -> zero confidence", r.confidence === 0)
  assert("no signal -> reasoning explains why", r.reasoning.length === 1 && r.reasoning[0].includes("no recognized"))
}

// A category + an agreeing dependency compound their weight and win domain.
{
  const r = inferEcosystem(signals({
    categories: ["web-programming::http-server"],
    dependencies: ["axum", "sqlx"], // axum -> web (agrees with category); sqlx -> database (weaker alone)
  }))
  assert("domain is web (category 3 + axum dep 2 = 5, beats database's 2)", r.domain === "web")
  assert("ecosystems includes web", r.ecosystems.includes("web"))
  assert("ecosystems includes database too (crossed MIN_TAG_WEIGHT via 1 dep = 2)", r.ecosystems.includes("database"))
  assert("technologies include Axum and SQLx", r.technologies.includes("Axum") && r.technologies.includes("SQLx"))
  assert("confidence reflects the compounded weight (5/6 = 0.83)", r.confidence === 0.83)
  assert("reasoning cites the category", r.reasoning.some((x) => x.includes("category 'web-programming")))
  assert("reasoning cites the axum dependency", r.reasoning.some((x) => x.includes("dependency 'axum'")))
}

// A single keyword alone (weight 1) is below MIN_TAG_WEIGHT(2) - not enough to classify,
// but still recorded in reasoning so nothing is silently dropped.
{
  const r = inferEcosystem(signals({ keywords: ["wasm"] }))
  assert("single keyword alone -> no ecosystems (below threshold)", r.ecosystems.length === 0)
  assert("single keyword alone -> no domain", r.domain === null)
  assert("single keyword alone -> zero confidence", r.confidence === 0)
  assert("keyword vote is still recorded in reasoning", r.reasoning.some((x) => x.includes("keyword 'wasm'")))
}

// Two independent keyword signals for the same tag compound to cross the threshold.
{
  const r = inferEcosystem(signals({ keywords: ["wasm", "webassembly"] }))
  assert("two agreeing keywords (1+1=2) cross MIN_TAG_WEIGHT", r.ecosystems.includes("wasm"))
  assert("domain becomes wasm", r.domain === "wasm")
}

// Unrecognized dependency names are silently ignored, not an error.
{
  const r = inferEcosystem(signals({ dependencies: ["some-obscure-crate-nobody-has-heard-of"] }))
  assert("unrecognized dep -> no classification", r.ecosystems.length === 0 && r.domain === null)
  assert("unrecognized dep -> no technology", r.technologies.length === 0)
}

// Determinism: identical input called twice yields byte-identical output.
{
  const input = signals({ categories: ["game-development"], dependencies: ["bevy", "wgpu"], keywords: ["gamedev"] })
  const a = JSON.stringify(inferEcosystem(input))
  const b = JSON.stringify(inferEcosystem(input))
  assert("same input twice -> byte-identical output", a === b)
}

// Multi-tag dependency (tower -> web + networking) votes for both.
{
  const r = inferEcosystem(signals({ dependencies: ["tower", "hyper"] })) // both tag web+networking, weight 2 each -> 4 each
  assert("multi-tag dependency contributes to both tags", r.ecosystems.includes("web") && r.ecosystems.includes("networking"))
}

if (failed) { console.error(`\n${failed} assertion(s) failed`); process.exit(1) }
console.log("ok - ecosystem intelligence: rule engine is deterministic, explainable, and correct")
