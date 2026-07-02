import { parse } from "smol-toml"

/**
 * Deterministic Cargo manifest and lockfile parsing.
 *
 * Cargo.toml / Cargo.lock are TOML, so a real TOML parser (smol-toml) handles
 * the syntax; this module applies the Cargo-specific domain rules on top:
 *   - path-only deps (`foo = { path = "..." }` with no version/git) are local
 *     workspace crates, not published crates, so they are dropped.
 *   - renamed deps (`foo = { package = "real" }`) record the real crate name.
 *   - workspace-inherited package fields (`rust-version.workspace = true`) fall
 *     back to the workspace root's [workspace.package] values.
 * All output arrays are sorted so identical input yields byte-identical output.
 */

export type CargoManifest = {
  crateName: string | null
  version: string | null
  edition: string | null
  msrv: string | null
  license: string | null
  keywords: string[]
  categories: string[]
  dependencies: string[]
  devDependencies: string[]
  buildDependencies: string[]
  features: string[]
  isWorkspace: boolean
  workspaceMembers: string[]
}

export type LockedPackage = { name: string; version: string }

type Table = Record<string, unknown>

function asTable(value: unknown): Table | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Table) : null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []
}

function uniqSorted(values: string[]): string[] {
  return [...new Set(values)].sort()
}

/**
 * Crate names from a dependency table. Drops path-only local deps and resolves
 * `package = "real"` renames to the published crate name.
 */
function depNames(table: unknown): string[] {
  const deps = asTable(table)
  if (!deps) return []
  const names: string[] = []
  for (const [name, spec] of Object.entries(deps)) {
    if (typeof spec === "string") { names.push(name); continue } // foo = "1.0"
    const t = asTable(spec)
    if (!t) continue
    if ("path" in t && !("version" in t) && !("git" in t)) continue // local crate
    names.push(typeof t.package === "string" ? t.package : name)
  }
  return names
}

/** Collect a dependency kind from top-level and every [target.*] table. */
function depsOfKind(root: Table, kind: "dependencies" | "dev-dependencies" | "build-dependencies"): string[] {
  const names = depNames(root[kind])
  const target = asTable(root.target)
  if (target) for (const cfg of Object.values(target)) {
    const cfgTable = asTable(cfg)
    if (cfgTable) names.push(...depNames(cfgTable[kind]))
  }
  return names
}

/** A package field, honouring `{ workspace = true }` inheritance from the root. */
function packageField(pkg: Table | null, wsPkg: Table | null, key: string): unknown {
  const own = pkg?.[key]
  if (own !== undefined && asTable(own)?.workspace !== true) return own
  return wsPkg?.[key]
}

export function parseCargoManifest(toml: string): CargoManifest {
  const root = asTable(parse(toml)) ?? {}
  const pkg = asTable(root.package)
  const workspace = asTable(root.workspace)
  const wsPkg = asTable(workspace?.package)

  const license = packageField(pkg, wsPkg, "license")
  const msrv = packageField(pkg, wsPkg, "rust-version")
  const edition = packageField(pkg, wsPkg, "edition")

  // [workspace.dependencies] are real external crates shared across members.
  const wsDeps = depNames(workspace?.dependencies)

  return {
    crateName: typeof pkg?.name === "string" ? pkg.name : null,
    version: typeof pkg?.version === "string" ? pkg.version : null,
    edition: typeof edition === "string" ? edition : null,
    msrv: typeof msrv === "string" ? msrv : null,
    license: typeof license === "string" ? license : null,
    keywords: uniqSorted(stringArray(packageField(pkg, wsPkg, "keywords"))),
    categories: uniqSorted(stringArray(packageField(pkg, wsPkg, "categories"))),
    dependencies: uniqSorted([...depsOfKind(root, "dependencies"), ...wsDeps]),
    devDependencies: uniqSorted(depsOfKind(root, "dev-dependencies")),
    buildDependencies: uniqSorted(depsOfKind(root, "build-dependencies")),
    features: uniqSorted(Object.keys(asTable(root.features) ?? {})),
    isWorkspace: workspace !== null,
    workspaceMembers: stringArray(workspace?.members),
  }
}

/** Resolved dependency graph from Cargo.lock ([[package]] entries), sorted. */
export function parseCargoLock(toml: string): LockedPackage[] {
  const root = asTable(parse(toml)) ?? {}
  const pkgs = Array.isArray(root.package) ? root.package : []
  const out: LockedPackage[] = []
  for (const entry of pkgs) {
    const t = asTable(entry)
    if (t && typeof t.name === "string" && typeof t.version === "string") {
      out.push({ name: t.name, version: t.version })
    }
  }
  return out.sort((a, b) => (a.name === b.name ? a.version.localeCompare(b.version) : a.name.localeCompare(b.name)))
}
