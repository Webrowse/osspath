import { readFileSync } from "fs"
import { join } from "path"
import type { OSSPath } from "@/content/oss-paths"

export type CompanionEntry = {
  repoCount: number
  companions: Array<{ name: string; count: number; percent: number }>
}

export type CompanionIndex = Record<string, CompanionEntry>

// Minimum global repo count for a crate to get a /deps/{crate} page.
// Must stay in sync with scripts/build-companion-index.mjs (MIN_REPOS) and
// the sitemap getDependencyUrls() function.
export const DEP_PAGE_THRESHOLD = 25

// Maximum repos rendered per dep page — keeps HTML reasonable for high-count crates.
export const DEP_MAX_REPOS = 50

const ROOT = process.cwd()

// Module-level cache — read once per build worker, not once per page.
let _companionIndex: CompanionIndex | null = null
let _ossRepos: OSSPath[] | null = null

export function getCompanionIndex(): CompanionIndex {
  if (!_companionIndex) {
    _companionIndex = JSON.parse(
      readFileSync(join(ROOT, "content/oss-companion-index.json"), "utf-8")
    )
  }
  return _companionIndex!
}

export function getOSSRepos(): OSSPath[] {
  if (!_ossRepos) {
    _ossRepos = JSON.parse(
      readFileSync(join(ROOT, "content/oss.json"), "utf-8")
    )
  }
  return _ossRepos!
}

// Returns all crates qualifying for a dep page, sorted by repoCount desc.
export function getQualifiedCrates(): string[] {
  const index = getCompanionIndex()
  return Object.entries(index)
    .filter(([, v]) => v.repoCount >= DEP_PAGE_THRESHOLD)
    .sort((a, b) => b[1].repoCount - a[1].repoCount)
    .map(([name]) => name)
}
