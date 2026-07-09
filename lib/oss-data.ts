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
