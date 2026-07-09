#!/usr/bin/env node
/**
 * Generates content/oss-list.json — the slim, public-safe projection of
 * content/oss.json that every public route reads through lib/oss-data.ts.
 *
 * Drops `relationships` entirely and reduces `ecosystemIntelligence` /
 * `enrichment` to only the sub-fields public routes actually read
 * (technologies; cargo.lockfileCrateCount + cargo.isWorkspace). Those full
 * blobs are only needed by the single-repo detail page, which reads
 * content/oss.json directly via lib/oss-detail-data.ts — a module
 * scripts/check-public-purity.mjs restricts to that one route, so the
 * production server never has to hold the full corpus in memory to serve
 * any other public page.
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
