/**
 * Pre-filtering and scoring for candidate scanners.
 * Goal: pass only high-signal candidates to DeepSeek to avoid noise and token waste.
 */

// ── Rust relevance ────────────────────────────────────────────────────────────

const STRONG_RUST_SIGNALS = [
  "rust engineer", "rust developer", "rust programmer", "rust backend",
  "rust systems", "rust dev", "rustlang", "rust-lang",
  "cargo", "tokio", "axum", "actix", "tonic", "bevy", "leptos", "yew",
  "no_std", "wasm-bindgen", "embassy",
  "rust is the primary", "primary language: rust", "written in rust",
  "embedded rust", "async rust",
]

const WEAK_RUST_PHRASES = [
  "rust nice to have", "rust a plus", "rust experience helpful",
  "rust would be a bonus", "exposure to rust", "familiarity with rust",
  "rust knowledge is a plus", "or rust", "and rust", "/rust",
]

/**
 * Returns a Rust-relevance verdict.
 * - "strong"  → explicit Rust role or codebase signal
 * - "weak"    → Rust mentioned but as one of many / nice-to-have
 * - "none"    → no Rust signal
 */
export function classifyRustSignal(text: string): "strong" | "weak" | "none" {
  const lc = text.toLowerCase()
  if (!lc.includes("rust")) return "none"

  // Strong signal beats weak signal — check strong first
  for (const phrase of STRONG_RUST_SIGNALS) {
    if (lc.includes(phrase)) return "strong"
  }

  // If only weak phrases match, return weak
  for (const phrase of WEAK_RUST_PHRASES) {
    if (lc.includes(phrase)) return "weak"
  }

  // Count language list patterns ("Python, Go, Rust, TypeScript" → weak)
  const langListPattern = /(?:python|go|java|kotlin|c\+\+|typescript|javascript|ruby|elixir|scala)[\s,/]+rust|rust[\s,/]+(?:python|go|java|kotlin|c\+\+|typescript|javascript|ruby|elixir|scala)/i
  if (langListPattern.test(text)) return "weak"

  // Plain mention without specific context → weak
  return "weak"
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export type ScoreBreakdown = {
  total: number
  reasons: string[]
}

/**
 * Score a job-like text. Higher = better match.
 * Threshold for queuing: total >= 4.
 */
export function scoreJobText(text: string): ScoreBreakdown {
  const lc = text.toLowerCase()
  let total = 0
  const reasons: string[] = []

  // Rust signal
  const signal = classifyRustSignal(text)
  if (signal === "strong") {
    total += 4
    reasons.push("explicit Rust role")
  } else if (signal === "weak") {
    total -= 2
    reasons.push("Rust only as nice-to-have")
  } else {
    total -= 5
    reasons.push("no Rust signal")
  }

  // Remote
  if (/\b(remote|distributed|worldwide|anywhere)\b/i.test(text) &&
      !/\bremote.{0,30}(only|within|in the)\s+(us|usa|uk|germany|france)\b/i.test(lc)) {
    total += 2
    reasons.push("remote")
  } else if (/\bremote\b/i.test(text)) {
    total += 1
    reasons.push("remote with geo restriction")
  }

  // Onsite / relocation penalties
  if (/\bonsite\b|\bon-site\b|\bin[- ]office\b|\bin[- ]person\b/i.test(text) &&
      !/\bremote\b/i.test(text)) {
    total -= 3
    reasons.push("onsite only")
  }
  if (/relocation\s+(required|mandatory|expected)/i.test(text)) {
    total -= 3
    reasons.push("relocation required")
  }

  // Seniority — prefer accessible roles
  if (/\b(junior|jr\.?|entry[- ]level|early[- ]career|intern|graduate|new[- ]grad)\b/i.test(text)) {
    total += 2
    reasons.push("junior-friendly")
  }
  if (/\b(mid[- ]level|mid[- ]senior|software engineer)\b/i.test(text)) {
    total += 1
    reasons.push("mid-level")
  }
  if (/\b(staff|principal|distinguished)\s+(engineer|developer)/i.test(text)) {
    total -= 4
    reasons.push("senior-only (staff/principal)")
  }
  if (/architect/i.test(text) && !/architecture/i.test(text)) {
    total -= 3
    reasons.push("architect role")
  }
  if (/\b1[0-9]\+?\s+years|\b15\+?\s+years|\b20\+?\s+years/i.test(text)) {
    total -= 3
    reasons.push("10+ years required")
  }

  // Clear "we are hiring" phrasing
  if (/\b(we are hiring|hiring|join us|join our team|now hiring|come work)\b/i.test(text)) {
    total += 1
    reasons.push("clear hiring intent")
  }

  // Apply link present
  if (/https?:\/\/[^\s)]+(?:apply|jobs|careers|hiring|positions)/i.test(text) ||
      /apply.{0,40}https?:\/\//i.test(text)) {
    total += 1
    reasons.push("apply link present")
  }

  return { total, reasons }
}

/** Threshold for queuing into pending. */
export const QUEUE_THRESHOLD = 4

export function shouldQueue(score: ScoreBreakdown): boolean {
  return score.total >= QUEUE_THRESHOLD
}
