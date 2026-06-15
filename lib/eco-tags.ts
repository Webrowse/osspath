export type EcoTag =
  | "bevy"
  | "tauri"
  | "blockchain"
  | "embedded"
  | "ai"
  | "wasm"
  | "database"
  | "grpc"
  | "cli"
  | "axum"
  | "tokio"

export interface RepoMeta {
  owner?: string
  name?:  string
  topics?: string[]
}

// ── Manual overrides (highest precedence) ────────────────────────────────────
// Applied before rule evaluation. Use only for confirmed mis-classifications
// that the rule engine cannot fix without a scoring system.
// Format: "owner/name" → [primary, secondary?]
import OVERRIDES_JSON from "@/content/eco-overrides.json"
const ECO_OVERRIDES: Record<string, EcoTag[]> = OVERRIDES_JSON as Record<string, EcoTag[]>

// ── Blockchain signals ────────────────────────────────────────────────────────

const BLOCKCHAIN_OWNERS = new Set([
  "FuelLabs", "paritytech", "foundry-rs", "paradigmxyz", "alloy-rs",
  "gakonst", "bluealloy", "solana-labs", "near", "MystenLabs",
  "starkware-libs", "succinctlabs", "axiom-crypto", "risc0",
  "ethereum", "ethereum-optimism", "a16z", "matter-labs", "scroll-tech",
])

const BLOCKCHAIN_TOPICS = new Set([
  "blockchain", "ethereum", "evm", "smart-contract", "smart-contracts",
  "defi", "rollup", "web3", "layer2", "zkvm", "zk-proofs",
  "zero-knowledge", "solana", "bitcoin", "layer-2",
  "l2", "zkevm", "zkp", "cryptocurrency",
])

// ── Embedded signals ──────────────────────────────────────────────────────────
// Orgs whose repos are embedded-systems by definition, even without explicit deps.
const EMBEDDED_OWNERS = new Set([
  "esp-rs",       // Espressif Rust (ESP32/ESP8266 HALs and toolchain)
  "embassy-rs",   // Embassy async embedded framework
  "rp-rs",        // Raspberry Pi Pico Rust (rp-hal)
  "knurling-rs",  // Ferrous Systems embedded tooling (defmt, probe-run)
  "tock",         // Tock embedded OS
  "rust-embedded", // Embedded WG (embedded-hal, svd2rust, cortex-m, etc.)
  "stm32-rs",     // STM32 Rust HALs
  "nrf-rs",       // Nordic nRF Rust HALs
  "atsamd-rs",    // Microchip SAMD Rust HALs
])

// Hardware-specific topics — deliberately excludes "embedded" (ambiguous:
// also used for "embedded database" / "embeddable library").
const EMBEDDED_TOPICS = new Set([
  "no-std",
  "no_std",
  "cortex-m",
  "microcontroller",
  "rtos",
  "bare-metal",
  "esp32",
  "esp8266",
  "stm32",
  "nrf52",
  "rp2040",
  "avr",
  "risc-v",
  "arm-cortex-m",
  "embedded-hal",   // the trait crate itself — unambiguously embedded-systems
])

// ── AI / ML signals ───────────────────────────────────────────────────────────
// Topics that unambiguously indicate machine-learning / AI focus.
const AI_TOPICS = new Set([
  "machine-learning",
  "deep-learning",
  "llm",
  "neural-network",
  "inference",
  "large-language-model",
  "generative-ai",
  "ai",
  "rag",
  "computer-vision",
])

// ── WASM signals ──────────────────────────────────────────────────────────────
const WASM_TOPICS = new Set([
  "wasm",
  "webassembly",
  "wasi",
  "web-assembly",
])

// ── Tokio ecosystem crates ────────────────────────────────────────────────────
// A project using only `tokio` as an async runtime is NOT a tokio-ecosystem
// project — tokio is infrastructure for half of the Rust ecosystem. We require
// at least one additional explicit ecosystem signal to assign the tag.
const TOKIO_ECOSYSTEM_DEPS = new Set([
  "tokio-stream",
  "tokio-util",
  "tower",
  "tower-service",
])

interface EcoRule {
  tag:   EcoTag
  check: (deps: ReadonlySet<string>, meta: RepoMeta) => boolean
}

// Rules ordered most-specific first — the first 2 matching tags are shown.
const ECO_RULES: EcoRule[] = [
  {
    tag: "bevy",
    check: (deps) => [...deps].some(d => d === "bevy" || d.startsWith("bevy_") || d.startsWith("bevy-")),
  },
  {
    tag: "tauri",
    check: (deps) => deps.has("tauri") || [...deps].some(d => d.startsWith("tauri-plugin")),
  },
  {
    tag: "blockchain",
    check: (deps, { owner = "", topics = [] }) =>
      deps.has("alloy-primitives") ||
      deps.has("alloy-sol-types") ||
      deps.has("alloy") ||
      deps.has("alloy-consensus") ||
      deps.has("alloy-network") ||
      deps.has("revm") ||
      deps.has("solana-sdk") ||
      deps.has("solana-client") ||
      deps.has("anchor-lang") ||
      deps.has("ethers") ||
      deps.has("ethers-core") ||
      deps.has("ethers-providers") ||
      deps.has("frame-support") ||
      deps.has("frame-system") ||
      deps.has("fuels") ||
      deps.has("fuel-core") ||
      deps.has("sp1-sdk") ||
      BLOCKCHAIN_OWNERS.has(owner) ||
      topics.some(t => BLOCKCHAIN_TOPICS.has(t)),
  },
  {
    tag: "embedded",
    // V1.5: added owner list + hardware-specific topic fallback
    check: (deps, { owner = "", topics = [] }) =>
      deps.has("embedded-hal") ||
      deps.has("cortex-m") ||
      deps.has("rtic") ||
      deps.has("embassy-executor") ||
      deps.has("defmt") ||
      deps.has("embassy-rp") ||
      deps.has("embassy-nrf") ||
      deps.has("embassy-stm32") ||
      deps.has("embassy-usb") ||
      deps.has("nrf-hal-common") ||
      deps.has("stm32f4xx-hal") ||
      deps.has("stm32h7xx-hal") ||
      deps.has("rp2040-hal") ||
      deps.has("avr-hal") ||
      deps.has("probe-rs") ||
      EMBEDDED_OWNERS.has(owner) ||
      topics.some(t => EMBEDDED_TOPICS.has(t)),
  },
  {
    tag: "ai",
    // V1.5: added topic fallback for LLM clients / AI tooling not using ML frameworks
    check: (deps, { topics = [] }) =>
      deps.has("candle-core") ||
      deps.has("tch") ||
      deps.has("ort") ||
      deps.has("async-openai") ||
      deps.has("llm") ||
      deps.has("tokenizers") ||
      deps.has("fastembed") ||
      deps.has("burn") ||
      deps.has("burn-core") ||
      deps.has("mistralrs") ||
      deps.has("llama-cpp-rs") ||
      deps.has("kalosm") ||
      deps.has("openai") ||
      deps.has("anthropic") ||
      topics.some(t => AI_TOPICS.has(t)),
  },
  {
    tag: "wasm",
    // V1.5: added topic fallback for WASM infrastructure (wit-bindgen, wasm-pack, etc.)
    check: (deps, { topics = [] }) =>
      deps.has("wasm-bindgen") ||
      deps.has("wasmtime") ||
      deps.has("wasmer") ||
      deps.has("js-sys") ||
      deps.has("leptos") ||
      deps.has("yew") ||
      deps.has("dioxus") ||
      topics.some(t => WASM_TOPICS.has(t)),
  },
  {
    tag: "database",
    check: (deps) =>
      deps.has("sqlx") ||
      deps.has("diesel") ||
      deps.has("sea-orm") ||
      deps.has("rusqlite") ||
      deps.has("mongodb") ||
      deps.has("redb") ||
      deps.has("redis") ||
      deps.has("sled"),
  },
  {
    tag: "grpc",
    check: (deps) =>
      deps.has("tonic") ||
      deps.has("tonic-build"),
  },
  {
    tag: "cli",
    // V1.5: clap demoted — it is present in ~50% of Rust binaries and is not
    // a meaningful identity signal on its own. Retained: TUI/interactive libraries
    // that only appear in intentional CLI/TUI projects.
    check: (deps, { topics = [] }) =>
      deps.has("ratatui") ||
      deps.has("crossterm") ||
      deps.has("tui") ||
      deps.has("reedline") ||
      deps.has("inquire") ||
      topics.some(t =>
        t === "cli" ||
        t === "tui" ||
        t === "terminal" ||
        t === "command-line" ||
        t === "command-line-tool" ||
        t === "command-line-interface"
      ),
  },
  {
    tag: "axum",
    check: (deps) => deps.has("axum") || deps.has("actix-web") || deps.has("rocket"),
  },
  {
    tag: "tokio",
    // V1.5: tokio alone is not a sufficient signal — it is async infrastructure
    // for half the Rust ecosystem. Require at least one explicit tokio-ecosystem
    // crate (tower, tokio-util, etc.) or an explicit topic self-identification.
    check: (deps, { topics = [] }) =>
      deps.has("tokio") && (
        [...deps].some(d => TOKIO_ECOSYSTEM_DEPS.has(d)) ||
        topics.includes("tokio") ||
        topics.includes("asynchronous")
      ),
  },
]

// Returns up to 2 ecosystem tags for a repo, most specific first.
// If meta.owner + meta.name are both provided, manual overrides are checked first.
export function getEcoTags(
  dependencies: string[] | undefined | null,
  meta?: RepoMeta,
): EcoTag[] {
  // Manual overrides take precedence over all rule evaluation
  if (meta?.owner && meta?.name) {
    const key = `${meta.owner}/${meta.name}`
    const override = ECO_OVERRIDES[key]
    if (override) return override
  }

  if (!dependencies?.length && !meta?.topics?.length && !meta?.owner) return []
  const depSet   = new Set(dependencies ?? [])
  const resolved: RepoMeta = meta ?? {}
  const tags: EcoTag[] = []
  for (const rule of ECO_RULES) {
    if (rule.check(depSet, resolved)) {
      tags.push(rule.tag)
      if (tags.length === 2) break
    }
  }
  return tags
}

export const ECO_LABEL: Record<EcoTag, string> = {
  bevy:       "bevy",
  tauri:      "tauri",
  blockchain: "chain",
  embedded:   "embedded",
  ai:         "ai",
  wasm:       "wasm",
  database:   "db",
  grpc:       "grpc",
  cli:        "cli",
  axum:       "axum",
  tokio:      "tokio",
}

export const ECO_DISPLAY_NAME: Record<EcoTag, string> = {
  bevy:       "Bevy Game Engine",
  tauri:      "Tauri Desktop",
  blockchain: "Blockchain",
  embedded:   "Embedded / no_std",
  ai:         "AI & Machine Learning",
  wasm:       "WebAssembly",
  database:   "Database",
  grpc:       "gRPC & Networking",
  cli:        "CLI & TUI",
  axum:       "Web & APIs",
  tokio:      "Async / Tokio",
}

export const ECO_TAG_ORDER: EcoTag[] = [
  "bevy", "tauri", "blockchain", "embedded", "ai",
  "wasm", "database", "grpc", "cli", "axum", "tokio",
]

export function isEcoTag(s: string): s is EcoTag {
  return (ECO_TAG_ORDER as string[]).includes(s)
}
