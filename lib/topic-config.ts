// Pure topic configuration — no server-only imports.
// Safe to import from both Server Components and Client Components.
// topics-data.ts imports and re-exports everything from here.

// Secondary tags that merge into each canonical slug.
export const TOPIC_ALIASES: Record<string, string[]> = {
  cli:       ["command-line", "command-line-tool", "terminal", "developer-tools"],
  wasm:      ["webassembly"],
  ai:        ["ai-agents", "agent", "agents", "artificial-intelligence", "agentic", "agentic-ai", "llm"],
  embedded:  ["embedded-hal", "embedded-rust", "esp32"],
  async:     ["asynchronous", "async-rust"],
  "no-std":  ["no_std"],
  database:  ["db", "embedded-database"],
  crypto:    ["cryptography"],
  compiler:  ["programming-language"],
}

// Canonical display names for the 15 approved topic pages.
export const TOPIC_DISPLAY_NAMES: Record<string, string> = {
  cli:        "CLI",
  web:        "Web",
  wasm:       "WebAssembly",
  database:   "Database",
  embedded:   "Embedded",
  ai:         "AI",
  sql:        "SQL",
  async:      "Async",
  parser:     "Parser",
  security:   "Security",
  game:       "Game",
  compiler:   "Compiler",
  blockchain: "Blockchain",
  crypto:     "Crypto",
  "no-std":   "no_std",
}

// Reverse alias map built once at module init: alias tag → canonical slug.
const _aliasToCanonical: Record<string, string> = {}
for (const [canonical, aliases] of Object.entries(TOPIC_ALIASES)) {
  for (const alias of aliases) {
    _aliasToCanonical[alias] = canonical
  }
}

/**
 * Given a raw topic tag from a repo, returns the canonical /topics/{slug}
 * if a topic page exists for it, or null if no page exists.
 *
 * Handles both direct canonical tags ("cli" → "cli") and aliases
 * ("command-line" → "cli", "no_std" → "no-std").
 */
export function getTopicPageSlug(tag: string): string | null {
  if (tag in TOPIC_DISPLAY_NAMES) return tag
  return _aliasToCanonical[tag] ?? null
}
