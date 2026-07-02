import type { DirEntry } from "./github-files"

/**
 * Workspace-aware Cargo.toml discovery, ported from the legacy offline indexer.
 *
 * When a repo has no root Cargo.toml, a bounded, deterministic BFS locates
 * manifests in subdirectories (directories with Rust-signal names are visited
 * first). Workspace member globs like "crates/*" are expanded by listing dirs.
 * All ordering is stable so the same repo yields the same manifest set.
 */

const SEARCH_MAX_DEPTH = 4
const SEARCH_MAX_DIRS = 40
const SEARCH_MAX_TOMLS = 5
const WORKSPACE_MEMBER_CAP = 50

type ListDir = (path: string) => Promise<DirEntry[]>

const RUST_DIR_SIGNALS: RegExp[] = [
  /^rust(-|_|$)/i, /(-|_)rs$/i, /^crates?$/i, /^compiler$/i, /^src-tauri$/i,
  /^core$/i, /^cli$/i, /^server$/i, /^backend$/i, /^engine$/i,
  /^runtime$/i, /^daemon$/i, /^hypervisor$/i, /^vm$/i, /^native$/i,
]

function rustDirScore(name: string): number {
  for (let i = 0; i < RUST_DIR_SIGNALS.length; i++) {
    if (RUST_DIR_SIGNALS[i].test(name)) return RUST_DIR_SIGNALS.length - i
  }
  return 0
}

/**
 * Manifest paths for a repo that has no root Cargo.toml. Bounded BFS; a
 * directory that contains a Cargo.toml is not descended into (its nested crates
 * are workspace members, resolved separately). Deterministic ordering.
 */
export async function findManifestPaths(listDir: ListDir): Promise<string[]> {
  const tomls: string[] = []
  const queue: Array<{ path: string; depth: number }> = [{ path: "", depth: 0 }]
  let inspected = 0

  while (queue.length > 0 && tomls.length < SEARCH_MAX_TOMLS && inspected < SEARCH_MAX_DIRS) {
    const { path, depth } = queue.shift()!
    if (depth >= SEARCH_MAX_DEPTH) continue
    inspected++

    const entries = await listDir(path)
    const hasToml = entries.some((e) => e.type === "file" && e.name === "Cargo.toml")
    if (hasToml) {
      tomls.push(path ? `${path}/Cargo.toml` : "Cargo.toml")
      continue // do not descend; nested crates handled by member resolution
    }
    entries
      .filter((e) => e.type === "dir" && depth + 1 < SEARCH_MAX_DEPTH)
      .sort((a, b) => rustDirScore(b.name) - rustDirScore(a.name) || a.name.localeCompare(b.name))
      .forEach((e) => queue.push({ path: e.path, depth: depth + 1 }))
  }
  return tomls
}

/** Expand workspace member patterns (including "dir/*" globs) to concrete paths. */
export async function resolveMembers(listDir: ListDir, patterns: string[]): Promise<string[]> {
  const paths: string[] = []
  for (const pattern of patterns) {
    if (pattern.includes("*")) {
      const dir = pattern.replace(/\/?\*.*$/, "")
      if (!dir) continue
      const entries = await listDir(dir)
      for (const e of entries) if (e.type === "dir") paths.push(e.path)
    } else {
      paths.push(pattern)
    }
  }
  return [...new Set(paths)].sort().slice(0, WORKSPACE_MEMBER_CAP)
}
