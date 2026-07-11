import "server-only"
import { readFileSync } from "fs"
import { join } from "path"
import type { OSSPublicRepo } from "@/content/oss-paths"

export type CompanionEntry = {
  repoCount: number
  companions: Array<{ name: string; count: number; percent: number }>
}

export type CompanionIndex = Record<string, CompanionEntry>

const ROOT = process.cwd()

let _ossRepos: OSSPublicRepo[] | null = null
let _companionIndex: CompanionIndex | null = null
let _qualifiedCrateSet: Set<string> | null = null

// The slim, public-safe corpus projection — see OSSPublicRepo in
// content/oss-paths.ts for what's dropped and why. Every public route reads
// the corpus through this function; none of them ever touch the full corpus.
export function getOSSRepos(): OSSPublicRepo[] {
  if (!_ossRepos) {
    _ossRepos = JSON.parse(readFileSync(join(ROOT, "content/oss-list.json"), "utf-8"))
  }
  return _ossRepos!
}

export function getCompanionIndex(): CompanionIndex {
  if (!_companionIndex) {
    _companionIndex = JSON.parse(
      readFileSync(join(ROOT, "content/oss-companion-index.json"), "utf-8")
    )
  }
  return _companionIndex!
}

// Just the crate names that qualify for a /deps/[crate] page — a few KB,
// generated at build time by scripts/build-oss-list.mjs. Lets a miss on
// /deps/[crate] (dynamicParams=false, so every live invocation is a miss —
// legit hits are served from the static cache) be ruled out without parsing
// the full 3.9MB companion index.
export function isQualifiedCrate(crate: string): boolean {
  if (!_qualifiedCrateSet) {
    const names: string[] = JSON.parse(
      readFileSync(join(ROOT, "content/oss-qualified-crates.json"), "utf-8")
    )
    _qualifiedCrateSet = new Set(names)
  }
  return _qualifiedCrateSet.has(crate)
}
