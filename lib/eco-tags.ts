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
  owner?:  string
  topics?: string[]
}

interface EcoRule {
  tag:   EcoTag
  check: (deps: ReadonlySet<string>, meta: RepoMeta) => boolean
}

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
      // Dependency signals — alloy, reth ecosystem, solana, substrate, fuel
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
      // Owner signals — canonical blockchain orgs
      BLOCKCHAIN_OWNERS.has(owner) ||
      // Topic signals
      topics.some(t => BLOCKCHAIN_TOPICS.has(t)),
  },
  {
    tag: "embedded",
    check: (deps) =>
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
      deps.has("probe-rs"),
  },
  {
    tag: "ai",
    check: (deps) =>
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
      deps.has("anthropic"),
  },
  {
    tag: "wasm",
    check: (deps) =>
      deps.has("wasm-bindgen") ||
      deps.has("wasmtime") ||
      deps.has("wasmer") ||
      deps.has("js-sys") ||
      deps.has("leptos") ||
      deps.has("yew") ||
      deps.has("dioxus"),
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
    check: (deps, { topics = [] }) =>
      deps.has("ratatui") ||
      deps.has("crossterm") ||
      deps.has("tui") ||
      deps.has("reedline") ||
      deps.has("inquire") ||
      deps.has("clap") ||
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
    check: (deps) => deps.has("tokio"),
  },
]

// Returns up to 2 ecosystem tags for a repo, most specific first.
export function getEcoTags(
  dependencies: string[] | undefined | null,
  meta?: RepoMeta,
): EcoTag[] {
  if (!dependencies?.length && !meta?.topics?.length && !meta?.owner) return []
  const depSet = new Set(dependencies ?? [])
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
