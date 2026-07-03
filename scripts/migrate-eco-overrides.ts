import { config } from "dotenv"
config({ path: ".env.local" }); config()

/**
 * One-time migration: seed the hand-edited content/eco-overrides.json (a
 * "owner/repo" -> EcoTag[] lookup map) into Override(kind="eco-tags"), so
 * /admin/overrides manages the real data instead of a file requiring a code
 * deploy to change. Safe to delete this script once it has been run against
 * production and verified.
 */

const SEED_ECO_OVERRIDES: Record<string, string[]> = {
  "esp-rs/esp-hal": ["embedded"],
  "tokio-rs/axum": ["axum"],
  "diesel-rs/diesel": ["database", "wasm"],
}

async function main() {
  const { upsertOverride } = await import("@/lib/admin/overrides")
  const entries = Object.entries(SEED_ECO_OVERRIDES)
  console.log(`Seeding ${entries.length} eco-tag overrides into Override(kind="eco-tags")...`)
  for (const [repo, tags] of entries) {
    await upsertOverride("eco-tags", repo, tags)
    console.log(`  ✓ ${repo} -> [${tags.join(", ")}]`)
  }
  console.log("Done. Verify at /admin/overrides and on the live site after publish.")
  process.exit(0)
}

main().catch((e) => { console.error("FAILED", e); process.exit(1) })
