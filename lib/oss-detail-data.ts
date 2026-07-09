import "server-only"
import { readFileSync } from "fs"
import { join } from "path"
import type { OSSPath } from "@/content/oss-paths"

// Full-fidelity corpus — includes `relationships` and the complete
// `ecosystemIntelligence`/`enrichment` blobs that lib/oss-data.ts's slim
// projection drops. Only the single-repo detail page needs this (similar
// repos, companion crates, classification reasoning, build profile), and
// that page is fully static (generateStaticParams + dynamicParams=false),
// so this only ever runs at build time — never in the running production
// server. scripts/check-public-purity.mjs enforces that no other public
// route imports this module.
const ROOT = process.cwd()

let _ossRepoDetails: OSSPath[] | null = null

export function getOSSRepoDetails(): OSSPath[] {
  if (!_ossRepoDetails) {
    _ossRepoDetails = JSON.parse(readFileSync(join(ROOT, "content/oss.json"), "utf-8"))
  }
  return _ossRepoDetails!
}
