import "server-only"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

export type SimilarEntry = { repo: string; score: number }

// { "owner/name" → [{ repo: "owner/name", score: 0.42 }, …] }
type SimilarIndex = Record<string, SimilarEntry[]>

const ROOT = process.cwd()
let _index: SimilarIndex | null = null

function getIndex(): SimilarIndex {
  if (!_index) {
    const path = join(ROOT, "content/oss-similar.json")
    _index = existsSync(path)
      ? JSON.parse(readFileSync(path, "utf-8"))
      : {}
  }
  return _index!
}

export function getSimilarRepos(slug: string): SimilarEntry[] {
  return getIndex()[slug] ?? []
}
