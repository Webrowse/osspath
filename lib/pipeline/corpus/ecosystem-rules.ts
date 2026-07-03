/**
 * Ecosystem Intelligence: deterministic, rule-based inference of ecosystem(s),
 * technologies, and domain classification from Tier 1's Cargo enrichment alone
 * (categories, keywords, dependencies) - no AI, no network, no cross-repo data.
 *
 * Every signal casts a weighted vote for one or more tags (a single shared
 * vocabulary used for both "ecosystems" and "domain" - domain is simply the
 * single highest-voted tag, ecosystems is the full ranked set above threshold).
 * Signal authority determines weight: a crates.io category is author-declared
 * and standardized (highest trust); a matched dependency is structural and
 * reliable; a free-text keyword is the weakest, least structured signal.
 * `reasoning` records every vote cast, so every classification is traceable to
 * the exact signal that produced it.
 *
 * This table is intentionally a curated v1, not exhaustive - extend the three
 * rule arrays below to broaden coverage; nothing else needs to change.
 */

export type CargoSignals = {
  categories: string[]
  keywords: string[]
  dependencies: string[]
  devDependencies: string[]
  buildDependencies: string[]
}

export type EcosystemResult = {
  ecosystems: string[]
  technologies: string[]
  domain: string | null
  confidence: number
  reasoning: string[]
}

type DependencyRule = { crate: string; technology: string; tags: string[] }
type CategoryRule = { prefix: string; tag: string }
type KeywordRule = { keyword: string; tag: string }

const WEIGHT = { category: 3, dependency: 2, keyword: 1 }
const MIN_TAG_WEIGHT = 2   // a single keyword alone (weight 1) is not enough to classify
const MAX_ECOSYSTEMS = 5
const CONFIDENCE_DIVISOR = 6 // weight 6+ (e.g. category + dependency agreeing) -> full confidence

// ── Dependency -> technology + ecosystem/domain tags ──────────────────────────
const DEPENDENCY_RULES: DependencyRule[] = [
  { crate: "axum", technology: "Axum", tags: ["web"] },
  { crate: "actix-web", technology: "Actix Web", tags: ["web"] },
  { crate: "warp", technology: "Warp", tags: ["web"] },
  { crate: "rocket", technology: "Rocket", tags: ["web"] },
  { crate: "poem", technology: "Poem", tags: ["web"] },
  { crate: "tower", technology: "Tower", tags: ["web", "networking"] },
  { crate: "hyper", technology: "Hyper", tags: ["web", "networking"] },
  { crate: "reqwest", technology: "Reqwest", tags: ["web", "networking"] },
  { crate: "diesel", technology: "Diesel", tags: ["database"] },
  { crate: "sqlx", technology: "SQLx", tags: ["database"] },
  { crate: "sea-orm", technology: "SeaORM", tags: ["database"] },
  { crate: "rusqlite", technology: "SQLite", tags: ["database"] },
  { crate: "tokio-postgres", technology: "PostgreSQL", tags: ["database"] },
  { crate: "mongodb", technology: "MongoDB", tags: ["database"] },
  { crate: "redis", technology: "Redis", tags: ["database"] },
  { crate: "clap", technology: "Clap", tags: ["cli"] },
  { crate: "structopt", technology: "StructOpt", tags: ["cli"] },
  { crate: "wasm-bindgen", technology: "wasm-bindgen", tags: ["wasm"] },
  { crate: "wasm-pack", technology: "wasm-pack", tags: ["wasm"] },
  { crate: "web-sys", technology: "web-sys", tags: ["wasm"] },
  { crate: "wasmtime", technology: "Wasmtime", tags: ["wasm"] },
  { crate: "wasmer", technology: "Wasmer", tags: ["wasm"] },
  { crate: "embedded-hal", technology: "embedded-hal", tags: ["embedded"] },
  { crate: "cortex-m", technology: "Cortex-M", tags: ["embedded"] },
  { crate: "esp-idf-sys", technology: "ESP-IDF", tags: ["embedded"] },
  { crate: "bevy", technology: "Bevy", tags: ["game-development"] },
  { crate: "ggez", technology: "ggez", tags: ["game-development"] },
  { crate: "macroquad", technology: "Macroquad", tags: ["game-development"] },
  { crate: "fyrox", technology: "Fyrox", tags: ["game-development"] },
  { crate: "candle-core", technology: "Candle", tags: ["machine-learning"] },
  { crate: "tch", technology: "tch (LibTorch)", tags: ["machine-learning"] },
  { crate: "burn", technology: "Burn", tags: ["machine-learning"] },
  { crate: "ndarray", technology: "ndarray", tags: ["machine-learning", "science"] },
  { crate: "linfa", technology: "Linfa", tags: ["machine-learning"] },
  { crate: "libp2p", technology: "libp2p", tags: ["blockchain", "networking"] },
  { crate: "solana-program", technology: "Solana", tags: ["blockchain"] },
  { crate: "ethers", technology: "Ethers", tags: ["blockchain"] },
  { crate: "alloy", technology: "Alloy", tags: ["blockchain"] },
  { crate: "wgpu", technology: "wgpu", tags: ["graphics"] },
  { crate: "vulkano", technology: "Vulkano", tags: ["graphics"] },
  { crate: "image", technology: "image", tags: ["graphics"] },
  { crate: "egui", technology: "egui", tags: ["gui"] },
  { crate: "iced", technology: "Iced", tags: ["gui"] },
  { crate: "druid", technology: "Druid", tags: ["gui"] },
  { crate: "slint", technology: "Slint", tags: ["gui"] },
  { crate: "tauri", technology: "Tauri", tags: ["gui", "web"] },
  { crate: "tonic", technology: "Tonic (gRPC)", tags: ["networking"] },
  { crate: "quinn", technology: "Quinn (QUIC)", tags: ["networking"] },
  { crate: "rustls", technology: "Rustls", tags: ["cryptography"] },
  { crate: "ring", technology: "Ring", tags: ["cryptography"] },
  { crate: "ed25519-dalek", technology: "ed25519-dalek", tags: ["cryptography"] },
  { crate: "nom", technology: "nom", tags: ["parsing"] },
  { crate: "pest", technology: "Pest", tags: ["parsing"] },
  { crate: "syn", technology: "syn", tags: ["compilers"] },
  { crate: "proc-macro2", technology: "proc-macro2", tags: ["compilers"] },
]

// ── Cargo category (crates.io taxonomy, prefix-matched for subcategories) ─────
const CATEGORY_RULES: CategoryRule[] = [
  { prefix: "command-line", tag: "cli" },
  { prefix: "web-programming", tag: "web" },
  { prefix: "network-programming", tag: "networking" },
  { prefix: "database", tag: "database" },
  { prefix: "embedded", tag: "embedded" },
  { prefix: "no-std", tag: "embedded" },
  { prefix: "game-development", tag: "game-development" },
  { prefix: "graphics", tag: "graphics" },
  { prefix: "gui", tag: "gui" },
  { prefix: "cryptography", tag: "cryptography" },
  { prefix: "authentication", tag: "cryptography" },
  { prefix: "wasm", tag: "wasm" },
  { prefix: "asynchronous", tag: "async" },
  { prefix: "concurrency", tag: "async" },
  { prefix: "science", tag: "science" },
  { prefix: "parser-implementations", tag: "parsing" },
  { prefix: "compilers", tag: "compilers" },
  { prefix: "emulators", tag: "emulation" },
  { prefix: "development-tools", tag: "developer-tools" },
  { prefix: "text-processing", tag: "text-processing" },
  { prefix: "multimedia", tag: "multimedia" },
]

// ── Free-text keyword (author-declared, weakest signal) ────────────────────────
const KEYWORD_RULES: KeywordRule[] = [
  { keyword: "webassembly", tag: "wasm" },
  { keyword: "wasm", tag: "wasm" },
  { keyword: "embedded", tag: "embedded" },
  { keyword: "gamedev", tag: "game-development" },
  { keyword: "game-engine", tag: "game-development" },
  { keyword: "blockchain", tag: "blockchain" },
  { keyword: "machine-learning", tag: "machine-learning" },
  { keyword: "deep-learning", tag: "machine-learning" },
  { keyword: "cli", tag: "cli" },
  { keyword: "web", tag: "web" },
  { keyword: "http", tag: "web" },
  { keyword: "database", tag: "database" },
  { keyword: "cryptography", tag: "cryptography" },
  { keyword: "networking", tag: "networking" },
  { keyword: "graphics", tag: "graphics" },
  { keyword: "gui", tag: "gui" },
  { keyword: "parser", tag: "parsing" },
  { keyword: "grpc", tag: "networking" },
]

/** Infer ecosystem knowledge from one repo's Tier 1 Cargo signals. Pure, deterministic. */
export function inferEcosystem(signals: CargoSignals): EcosystemResult {
  const tagWeight = new Map<string, number>()
  const technologies = new Set<string>()
  const reasoning: string[] = []

  function vote(tag: string, weight: number) {
    tagWeight.set(tag, (tagWeight.get(tag) ?? 0) + weight)
  }

  const allDeps = new Set([...signals.dependencies, ...signals.devDependencies, ...signals.buildDependencies])
  for (const rule of DEPENDENCY_RULES) {
    if (!allDeps.has(rule.crate)) continue
    technologies.add(rule.technology)
    for (const tag of rule.tags) vote(tag, WEIGHT.dependency)
    reasoning.push(`dependency '${rule.crate}' -> ${rule.tags.join(", ")} (technology '${rule.technology}', weight ${WEIGHT.dependency})`)
  }

  for (const cat of signals.categories) {
    const lower = cat.toLowerCase()
    for (const rule of CATEGORY_RULES) {
      if (!lower.startsWith(rule.prefix)) continue
      vote(rule.tag, WEIGHT.category)
      reasoning.push(`category '${cat}' -> ${rule.tag} (weight ${WEIGHT.category})`)
    }
  }

  for (const kw of signals.keywords) {
    const lower = kw.toLowerCase()
    for (const rule of KEYWORD_RULES) {
      if (lower !== rule.keyword) continue
      vote(rule.tag, WEIGHT.keyword)
      reasoning.push(`keyword '${kw}' -> ${rule.tag} (weight ${WEIGHT.keyword})`)
    }
  }

  const ranked = [...tagWeight.entries()]
    .filter(([, w]) => w >= MIN_TAG_WEIGHT)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  const ecosystems = ranked.slice(0, MAX_ECOSYSTEMS).map(([tag]) => tag)
  const domain = ranked.length > 0 ? ranked[0][0] : null
  const confidence = ranked.length > 0 ? Math.min(1, Math.round((ranked[0][1] / CONFIDENCE_DIVISOR) * 100) / 100) : 0

  if (reasoning.length === 0) reasoning.push("no recognized categories, keywords, or dependencies")

  return { ecosystems, technologies: [...technologies].sort(), domain, confidence, reasoning }
}
