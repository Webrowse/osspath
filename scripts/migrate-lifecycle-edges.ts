import { config } from "dotenv"
config({ path: ".env.local" }); config()

/**
 * One-time migration: seed the hand-edited content/lifecycle-edges.json
 * (acquisition/merger/rename relationships) into Override(kind="lifecycle-edges"),
 * so /admin/overrides manages the real data instead of a file requiring a
 * code deploy to change. Safe to delete this script once it has been run
 * against production and verified.
 */

const SEED_LIFECYCLE_EDGES = [
  { edge_type: "acquired_by", from_slug: "astral", to_slug: "openai", effective_date: "2026-03-19", source: "https://openai.com/index/openai-to-acquire-astral/" },
  { edge_type: "acquired_by", from_slug: "quickwit-oss", to_slug: "datadog", effective_date: "2025-01", source: "https://www.datadoghq.com/blog/datadog-acquires-quickwit/" },
  { edge_type: "acquired_by", from_slug: "bun", to_slug: "anthropic", effective_date: "2025-12-02", source: "https://bun.com/blog/bun-joins-anthropic" },
]

async function main() {
  const { upsertOverride } = await import("@/lib/admin/overrides")
  console.log(`Seeding ${SEED_LIFECYCLE_EDGES.length} lifecycle edges into Override(kind="lifecycle-edges")...`)
  for (const edge of SEED_LIFECYCLE_EDGES) {
    const key = `${edge.edge_type}:${edge.from_slug}:${edge.to_slug}`
    await upsertOverride("lifecycle-edges", key, edge)
    console.log(`  ✓ ${edge.from_slug} -> ${edge.edge_type} -> ${edge.to_slug}`)
  }
  console.log("Done. Verify at /admin/overrides and on the live site after publish.")
  process.exit(0)
}

main().catch((e) => { console.error("FAILED", e); process.exit(1) })
