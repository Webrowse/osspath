import { TOPIC_ALIASES, TOPIC_DISPLAY_NAMES } from "@/lib/topic-config"
import { getOSSRepos } from "@/lib/oss-data"

// Re-export so existing imports from this module continue to work unchanged.
export { TOPIC_ALIASES, TOPIC_DISPLAY_NAMES, getTopicPageSlug } from "@/lib/topic-config"

export const TOPIC_PAGE_THRESHOLD = 25
export const TOPIC_MAX_REPOS = 50

// Topics that never receive pages regardless of repo count.
export const EXCLUDED_TOPICS = new Set([
  "rust", "rust-lang", "hacktoberfest", "claude", "claude-code", "anthropic", "codex",
  "bash", "python", "javascript", "react", "linux", "macos", "android",
  "aws", "kubernetes", "docker", "tokio", "http",
])

// Deterministic SEO descriptions. Count is injected at render time.
export const TOPIC_DESCRIPTIONS: Record<string, (count: number) => string> = {
  cli:        (n) => `Browse ${n} Rust CLI projects — terminal apps, developer tools, and command-line utilities.`,
  web:        (n) => `Browse ${n} Rust web projects including frameworks, APIs, static sites, and production services.`,
  wasm:       (n) => `Browse ${n} Rust WebAssembly projects including frameworks, tooling, and browser-targeting libraries.`,
  database:   (n) => `Browse ${n} Rust database projects — storage engines, query languages, ORMs, and data tooling.`,
  embedded:   (n) => `Browse ${n} Rust embedded projects targeting microcontrollers, real-time systems, and bare-metal environments.`,
  ai:         (n) => `Browse ${n} Rust AI projects — LLM frameworks, agent runtimes, inference engines, and ML tooling.`,
  sql:        (n) => `Browse ${n} Rust SQL projects including databases, query builders, ORMs, and data warehouses.`,
  async:      (n) => `Browse ${n} Rust async projects built on Tokio, async-std, and the futures ecosystem.`,
  parser:     (n) => `Browse ${n} Rust parser projects — combinators, PEG parsers, language tooling, and format handlers.`,
  security:   (n) => `Browse ${n} Rust security projects including network scanners, cryptographic libraries, and security tooling.`,
  game:       (n) => `Browse ${n} Rust game projects — engines, simulators, renderers, and interactive applications.`,
  compiler:   (n) => `Browse ${n} Rust compiler projects — programming languages, transpilers, and language tooling built in Rust.`,
  blockchain: (n) => `Browse ${n} Rust blockchain projects — L1s, rollups, smart contract VMs, and decentralized infrastructure.`,
  crypto:     (n) => `Browse ${n} Rust cryptography libraries covering symmetric ciphers, asymmetric key exchange, and TLS.`,
  "no-std":   (n) => `Browse ${n} Rust no_std projects targeting embedded systems, kernel development, and constrained environments.`,
}

// Backward-compat alias — callers that import getOSSReposForTopics() keep working.
export function getOSSReposForTopics() {
  return getOSSRepos()
}

// Returns the full tag set for a canonical topic (canonical + all aliases).
export function getTopicTags(topic: string): string[] {
  return [topic, ...(TOPIC_ALIASES[topic] ?? [])]
}

// Returns all repos that match a topic (via canonical tag or any alias),
// sorted stars desc → pushedAt desc → name asc.
export function getTopicRepos(topic: string) {
  const tags = new Set(getTopicTags(topic))
  return getOSSRepos()
    .filter((r) => (r.topics ?? []).some((t) => tags.has(t)))
    .sort(
      (a, b) =>
        (b.stars ?? 0) - (a.stars ?? 0) ||
        new Date(b.pushedAt ?? 0).getTime() - new Date(a.pushedAt ?? 0).getTime() ||
        (a.name ?? "").localeCompare(b.name ?? "")
    )
}

// Returns the 15 canonical approved topic slugs, in TOPIC_DISPLAY_NAMES order.
// All pass the threshold — this list is stable; computed once at startup.
export function getQualifiedTopics(): string[] {
  return Object.keys(TOPIC_DISPLAY_NAMES).filter(
    (topic) => !EXCLUDED_TOPICS.has(topic) && getTopicRepos(topic).length >= TOPIC_PAGE_THRESHOLD
  )
}
