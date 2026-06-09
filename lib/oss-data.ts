import "server-only"
import { readFileSync } from "fs"
import { join } from "path"
import type { OSSPath } from "@/content/oss-paths"

export type CompanionEntry = {
  repoCount: number
  companions: Array<{ name: string; count: number; percent: number }>
}

export type CompanionIndex = Record<string, CompanionEntry>

const ROOT = process.cwd()

let _ossRepos: OSSPath[] | null = null
let _companionIndex: CompanionIndex | null = null

export function getOSSRepos(): OSSPath[] {
  if (!_ossRepos) {
    _ossRepos = JSON.parse(readFileSync(join(ROOT, "content/oss.json"), "utf-8"))
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
