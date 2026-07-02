import { parseCargoManifest, parseCargoLock } from "./cargo-parse"
import { findManifestPaths, resolveMembers } from "./workspace"
import type { Enricher, EnrichInput, EnricherResult } from "./types"

/**
 * Cargo enricher (required): turns a discovered GitHub repo into what it is in
 * Rust terms - its crates, dependency surface, features, MSRV, license, keywords
 * and categories - by reading Cargo.toml (root or workspace-discovered), the
 * workspace members, and Cargo.lock. Deterministic; readers fail closed, so a
 * repo whose manifests can't be fetched is held back rather than published bare.
 */

export type CrateRef = { name: string; path: string }

export type CargoEnrichment = {
  hasManifest: boolean
  isWorkspace: boolean
  manifestPaths: string[]
  crates: CrateRef[]
  dependencies: string[]
  devDependencies: string[]
  buildDependencies: string[]
  features: string[]
  msrv: string | null
  edition: string | null
  license: string | null
  keywords: string[]
  categories: string[]
  hasLockfile: boolean
  lockfileCrateCount: number | null
}

function emptyCargo(hasManifest: boolean): CargoEnrichment {
  return {
    hasManifest, isWorkspace: false, manifestPaths: [], crates: [],
    dependencies: [], devDependencies: [], buildDependencies: [], features: [],
    msrv: null, edition: null, license: null, keywords: [], categories: [],
    hasLockfile: false, lockfileCrateCount: null,
  }
}

export const cargoEnricher: Enricher = {
  name: "cargo",
  required: true,

  async run(input: EnrichInput): Promise<EnricherResult> {
    // Root Cargo.toml is the fast path; otherwise BFS-discover manifests.
    const rootContent = await input.readFile("Cargo.toml")
    const manifestPaths = rootContent !== null ? ["Cargo.toml"] : await findManifestPaths(input.listDir)

    if (manifestPaths.length === 0) {
      return { ok: true, data: { cargo: emptyCargo(false) }, notes: ["no Cargo.toml found"] }
    }

    const dependencies = new Set<string>()
    const devDependencies = new Set<string>()
    const buildDependencies = new Set<string>()
    const crates: CrateRef[] = []
    let primary: ReturnType<typeof parseCargoManifest> | null = null

    for (const path of manifestPaths) {
      const content = path === "Cargo.toml" && rootContent !== null ? rootContent : await input.readFile(path)
      if (content === null) continue
      const manifest = parseCargoManifest(content)
      primary ??= manifest
      if (manifest.crateName) crates.push({ name: manifest.crateName, path })
      manifest.dependencies.forEach((d) => dependencies.add(d))
      manifest.devDependencies.forEach((d) => devDependencies.add(d))
      manifest.buildDependencies.forEach((d) => buildDependencies.add(d))

      if (manifest.workspaceMembers.length > 0) {
        const baseDir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""
        const patterns = manifest.workspaceMembers.map((m) => (baseDir ? `${baseDir}/${m}` : m))
        for (const dir of await resolveMembers(input.listDir, patterns)) {
          const memberContent = await input.readFile(`${dir}/Cargo.toml`)
          if (memberContent === null) continue
          const member = parseCargoManifest(memberContent)
          if (member.crateName) crates.push({ name: member.crateName, path: `${dir}/Cargo.toml` })
          member.dependencies.forEach((d) => dependencies.add(d))
          member.devDependencies.forEach((d) => devDependencies.add(d))
          member.buildDependencies.forEach((d) => buildDependencies.add(d))
        }
      }
    }

    const lock = await input.readFile("Cargo.lock")

    const cargo: CargoEnrichment = {
      hasManifest: true,
      isWorkspace: primary?.isWorkspace ?? false,
      manifestPaths: [...manifestPaths].sort(),
      crates: crates.sort((a, b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name)),
      dependencies: [...dependencies].sort(),
      devDependencies: [...devDependencies].sort(),
      buildDependencies: [...buildDependencies].sort(),
      features: primary?.features ?? [],
      msrv: primary?.msrv ?? null,
      edition: primary?.edition ?? null,
      license: primary?.license ?? null,
      keywords: primary?.keywords ?? [],
      categories: primary?.categories ?? [],
      hasLockfile: lock !== null,
      lockfileCrateCount: lock !== null ? parseCargoLock(lock).length : null,
    }
    return { ok: true, data: { cargo } }
  },
}
