#!/usr/bin/env node
/**
 * Generates two slim, public-safe build artifacts from the tracked content
 * snapshots so public routes never need to parse the large source files
 * directly:
 *
 * - content/oss-list.json: projection of content/oss.json that every public
 *   route reads through lib/oss-data.ts. Drops `relationships` entirely and
 *   reduces `ecosystemIntelligence` / `enrichment` to only the sub-fields
 *   public routes actually read (technologies; cargo.lockfileCrateCount +
 *   cargo.isWorkspace). The full blobs are only needed by the single-repo
 *   detail page, which reads content/oss.json directly via
 *   lib/oss-detail-data.ts — a module scripts/check-public-purity.mjs
 *   restricts to that one route, so the production server never has to hold
 *   the full corpus in memory to serve any other public page.
 *
 * - content/oss-qualified-crates.json: just the crate names that qualify
 *   for a /deps/[crate] page (repoCount >= DEP_PAGE_THRESHOLD), so
 *   app/deps/[crate]/page.tsx can check existence without parsing the full
 *   3.9MB content/oss-companion-index.json. Threshold must stay in sync
 *   with DEP_PAGE_THRESHOLD in lib/deps-data.ts and MIN_REPOS in
 *   scripts/build-companion-index.mjs.
 *
 * Run: node scripts/build-oss-list.mjs
 * Invoked automatically as "prebuild" in package.json.
 */
import { readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

const raw = readFileSync(join(ROOT, "content/oss.json"), "utf8")
const OSS = JSON.parse(raw)

const list = OSS.map((r) => {
  const { relationships, ecosystemIntelligence, enrichment, ...slim } = r

  if (ecosystemIntelligence?.technologies?.length) {
    slim.ecosystemIntelligence = { technologies: ecosystemIntelligence.technologies }
  }

  const cargo = enrichment?.cargo
  if (cargo && (cargo.lockfileCrateCount != null || cargo.isWorkspace != null)) {
    slim.enrichment = {
      cargo: {
        lockfileCrateCount: cargo.lockfileCrateCount ?? null,
        isWorkspace: cargo.isWorkspace ?? false,
      },
    }
  }

  return slim
})

const out = join(ROOT, "content/oss-list.json")
const payload = JSON.stringify(list)
writeFileSync(out, payload)

const fullMb = (Buffer.byteLength(raw) / 1024 / 1024).toFixed(1)
const slimMb = (Buffer.byteLength(payload) / 1024 / 1024).toFixed(1)
console.log(`✓ oss-list.json — ${list.length} repos, ${slimMb} MB (from ${fullMb} MB full corpus)`)

const DEP_PAGE_THRESHOLD = 25
const companionIndex = JSON.parse(readFileSync(join(ROOT, "content/oss-companion-index.json"), "utf8"))
const qualifiedCrates = Object.entries(companionIndex)
  .filter(([, v]) => v.repoCount >= DEP_PAGE_THRESHOLD)
  .map(([name]) => name)

const qualifiedOut = join(ROOT, "content/oss-qualified-crates.json")
const qualifiedPayload = JSON.stringify(qualifiedCrates)
writeFileSync(qualifiedOut, qualifiedPayload)

console.log(`✓ oss-qualified-crates.json — ${qualifiedCrates.length} crates, ${(Buffer.byteLength(qualifiedPayload) / 1024).toFixed(1)} KB`)
