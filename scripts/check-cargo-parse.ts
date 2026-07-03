/**
 * Parser guard for Cargo.toml / Cargo.lock extraction (lib/pipeline/enrich/cargo-parse).
 * Deterministic, no network. Run: tsx scripts/check-cargo-parse.ts
 */
import { parseCargoManifest, parseCargoLock } from "@/lib/pipeline/enrich/cargo-parse"

let failed = 0
function eq(label: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g !== w) { console.error(`x ${label}\n    got:  ${g}\n    want: ${w}`); failed++ }
}

// 1. Package metadata + dep kinds + path/rename filtering + sorting.
const single = parseCargoManifest(`
[package]
name = "demo"
version = "0.2.0"
edition = "2021"
rust-version = "1.74"
license = "MIT OR Apache-2.0"
keywords = ["cli", "async"]
categories = ["command-line-utilities"]

[dependencies]
serde = { version = "1", features = ["derive"] }
tokio = "1"
local = { path = "../local" }              # path-only -> dropped
renamed = { package = "real-crate", version = "2" }
gitdep = { git = "https://x", version = "0" }

[dev-dependencies]
criterion = "0.5"

[build-dependencies]
cc = "1"

[features]
default = ["a"]
a = []
`)
eq("single.crateName", single.crateName, "demo")
eq("single.msrv", single.msrv, "1.74")
eq("single.edition", single.edition, "2021")
eq("single.license", single.license, "MIT OR Apache-2.0")
eq("single.keywords", single.keywords, ["async", "cli"])
eq("single.categories", single.categories, ["command-line-utilities"])
eq("single.dependencies", single.dependencies, ["gitdep", "real-crate", "serde", "tokio"]) // local dropped, rename resolved, sorted
eq("single.devDependencies", single.devDependencies, ["criterion"])
eq("single.buildDependencies", single.buildDependencies, ["cc"])
eq("single.features", single.features, ["a", "default"])
eq("single.isWorkspace", single.isWorkspace, false)

// 2. Determinism: reordered keys yield identical output.
const reordered = parseCargoManifest(`
[dependencies]
tokio = "1"
serde = "1"
[package]
name = "demo"
`)
eq("determinism", reordered.dependencies, ["serde", "tokio"])

// 3. Workspace: members, [workspace.dependencies], and package-field inheritance.
const ws = parseCargoManifest(`
[workspace]
members = ["crates/*", "app"]

[workspace.package]
rust-version = "1.80"
license = "Apache-2.0"

[workspace.dependencies]
anyhow = "1"

[package]
name = "root"
rust-version.workspace = true
license.workspace = true
`)
eq("ws.isWorkspace", ws.isWorkspace, true)
eq("ws.members", ws.workspaceMembers, ["crates/*", "app"])
eq("ws.msrv(inherited)", ws.msrv, "1.80")
eq("ws.license(inherited)", ws.license, "Apache-2.0")
eq("ws.dependencies(ws-level)", ws.dependencies, ["anyhow"])

// 4. target.'cfg(...)' dependency tables are collected.
const target = parseCargoManifest(`
[package]
name = "p"
[dependencies]
core-dep = "1"
[target.'cfg(unix)'.dependencies]
nix = "0.27"
[target.'cfg(windows)'.build-dependencies]
winres = "0.1"
`)
eq("target.dependencies", target.dependencies, ["core-dep", "nix"])
eq("target.buildDependencies", target.buildDependencies, ["winres"])

// 5. Cargo.lock: [[package]] entries, sorted, name+version only.
const lock = parseCargoLock(`
version = 3
[[package]]
name = "tokio"
version = "1.40.0"
[[package]]
name = "serde"
version = "1.0.210"
[[package]]
name = "serde"
version = "0.9.0"
`)
eq("lock", lock, [
  { name: "serde", version: "0.9.0" },
  { name: "serde", version: "1.0.210" },
  { name: "tokio", version: "1.40.0" },
])

if (failed) { console.error(`\n${failed} assertion(s) failed`); process.exit(1) }
console.log("ok - cargo-parse: manifest + lock extraction is correct and deterministic")
