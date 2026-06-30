import type { ContentType, ExtractionResult } from "./types"

// DeepSeek uses the OpenAI-compatible path. The /v1/ prefix is optional but accepted.
const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions"
const MODEL = "deepseek-chat"

const PROMPTS: Record<ContentType, string> = {
  jobs: `You are a structured data extractor for a Rust-only jobs site. Return ONLY valid JSON with no markdown.

FIRST: Is Rust the primary or co-primary programming language for this specific role?
- If the role title is "Go Developer", "Python Engineer", "Mobile Developer", etc. and Rust is only mentioned in the company's broader tech stack but not required for the role itself, return exactly: {"skip": true}
- If the role explicitly requires Rust, is written in Rust, or Rust is the main language of the codebase this role works on, continue.

If NOT skipping, return a JSON object with:
company (string), role (string), href (string — direct apply URL or careers page), note (string — 1-2 factual sentences about the role and how Rust is used), tags (string[] — e.g. ["Remote", "EU", "Hybrid"]), topics (string[] — e.g. ["infra", "backend", "embedded"]), rustMentioned (boolean — true only if Rust is explicitly required for the role), remoteConfirmed (boolean).

Omit fields you cannot determine. Do not invent information.`,

  oss: `You are a structured data extractor. Return ONLY valid JSON with no markdown.

Extract an open source Rust project. Return a JSON object with:
name (string), eco (string — short category like "CLI · Tooling"), href (string — GitHub URL), note (string — 1 factual sentence about contribution environment), topics (string[] — e.g. ["cli", "parser"]), maintainerFriendliness (number 0-1), issueQuality (number 0-1), beginnerSuitability (number 0-1), maintainerLabel (string), issueLabel (string), beginnerLabel (string).`,

  grants: `You are a structured data extractor. Return ONLY valid JSON with no markdown.

FIRST check: is this content actually about a grant, bounty, hackathon, or sponsorship for Rust/open-source work?
If NOT (e.g. it is a job posting, a library release, a blog post, a company announcement, or unrelated content), return exactly: {"skip":true}

If YES, extract:
kind (one of: "Grant", "Bounty", "Hackathon", "Sponsorship"), name (string — program name, not article title), description (string — 1 sentence on what funded work looks like), status (string — "Open", "Closed", or "Announced"), href (string — link to the actual grant page, NOT a news article URL).

Never invent URLs. If you cannot find a real grant page URL, omit href.`,

  pulse: `You are a structured data extractor. Return ONLY valid JSON with no markdown.

Extract an ecosystem resource. Return a JSON object with:
kind (one of: "Newsletter", "Forum", "Blog", "Community", "Podcast"), title (string), description (string — 1 sentence), href (string).`,

  events: `You are a structured data extractor. Return ONLY valid JSON with no markdown.

Extract a Rust event. Return a JSON object with:
title (string), day (string — day number or "—" for recurring), month (string — abbreviated like "Jun" or period like "Monthly"), meta (string — format/cost), href (string), recurring (boolean).`,

  companies: `You are a structured data extractor. Return ONLY valid JSON with no markdown.

Extract a company using Rust in production. Return a JSON object with:
name (string), sector (string — short like "Storage"), href (string — company website).`,

  portals: `You are a structured data extractor. Return ONLY valid JSON with no markdown.

Extract a job portal or job board. Return a JSON object with:
name (string), kind (one of: "Rust-specific", "Aggregator", "Community", "General"), description (string — 1 sentence), href (string), tags (string[] — e.g. ["remote-only", "curated"]).`,

  news: `You are a structured data extractor. Return ONLY valid JSON with no markdown.

Extract a news article, blog post, or release announcement about Rust. Return a JSON object with:
title (string), href (string), kind (one of: "Release", "Blog", "Announcement", "Tutorial", "Discussion", "Project"), date (string — YYYY-MM-DD if known, else today), source (string — e.g. "twir", "reddit", "rust-blog"), blurb (string — 1 sentence summary).`,
}

// ── GitHub repo batch classifier ──────────────────────────────────────────────

export interface RepoInput {
  id: number
  name: string
  full_name: string
  description: string | null
  topics: string[]
  stargazers_count: number
  pushed_at: string
  size: number
  open_issues_count: number
  good_first_issues_count?: number
  help_wanted_issues_count?: number
  forks_count: number
  html_url: string
  // Fields present in GitHub API response but previously untyped
  language?: string | null
  owner_login?: string
  license_spdx_id?: string | null
}

export interface RepoClassification {
  // Maps to existing OSS PendingItem.extracted fields
  name: string
  eco: string
  href: string
  note: string
  topics: string[]
  maintainerFriendliness: number
  issueQuality: number
  beginnerSuitability: number
  maintainerLabel: string
  issueLabel: string
  beginnerLabel: string
  // Extended fields
  ecosystem: string[]
  activityTier: "active" | "maintenance" | "dormant"
  beginnerFriendly: boolean
  stars: number
  pushedAt: string
  queue: boolean
  skipReason: string
}

const REPO_CLASSIFY_SYSTEM = `You are classifying GitHub repositories for a curated Rust ecosystem discovery tool.

Given a JSON array of GitHub repos, classify each one in order. Return a JSON object:
{ "results": [ ...one entry per repo in the same order... ] }

Each entry must have:
- name (string): repo name as-is
- eco (string): short category, 1-3 words joined by " · " e.g. "Async · Runtime" or "CLI · Tooling" or "Embedded · no_std"
- href (string): the html_url value
- note (string): 1-2 factual sentences about what it does and why it is worth contributing to
- topics (string[]): 3-6 lowercase tags e.g. ["tokio", "async", "networking"]
- maintainerFriendliness (number 0-1): 0.8 if pushed recently + has issues, 0.5 if quieter, 0.3 if dormant
- issueQuality (number 0-1): estimate from open_issues_count and description signals
- beginnerSuitability (number 0-1): small scope + clear purpose = higher
- maintainerLabel (string): short phrase e.g. "Active — merged PRs recently" or "Stable, low churn"
- issueLabel (string): short phrase e.g. "12 open issues" or "Issue tracker active"
- beginnerLabel (string): short phrase e.g. "Small codebase, good first target" or "Complex internals"
- ecosystem (string[]): specific Rust packages/frameworks e.g. ["tokio", "axum"] or ["bevy"] or ["embassy"]
- activityTier (string): one of "active" | "maintenance" | "dormant". Use pushed_at as primary signal: within 30d = likely active, 30-90d = maintenance, >90d = dormant
- beginnerFriendly (boolean): true if scope is approachable and description signals welcoming community. good_first_issues_count > 0 is a strong positive signal.
- stars (number): pass through the stargazers_count value
- pushedAt (string): pass through the pushed_at value
- queue (boolean): false ONLY if the repo is a personal experiment, docs-only list (starts with "awesome-" or "list-of-"), mirror/fork summary, or clearly not a primary Rust project. Dormant alone is NOT a reason to skip.
- skipReason (string): empty string if queue=true, otherwise a short reason

When good_first_issues_count or help_wanted_issues_count are present and > 0, use them to set higher beginnerSuitability and beginnerFriendly=true, and mention the count in beginnerLabel and issueLabel.

Hard rules:
- Every field must be present, even if empty string or 0.
- Do not invent information not in the input.
- Return ONLY the JSON object. No markdown, no explanation.`

export async function classifyReposWithDeepSeek(
  repos: RepoInput[]
): Promise<{ results: RepoClassification[]; error?: string }> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return {
      results: repos.map((r) => fallbackClassification(r)),
      error: "DEEPSEEK_API_KEY not set — classifications are placeholders",
    }
  }

  const input = repos.map((r) => ({
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    description: r.description ?? "",
    topics: r.topics,
    stargazers_count: r.stargazers_count,
    pushed_at: r.pushed_at,
    size: r.size,
    open_issues_count: r.open_issues_count,
    good_first_issues_count: r.good_first_issues_count ?? 0,
    help_wanted_issues_count: r.help_wanted_issues_count ?? 0,
    forks_count: r.forks_count,
    html_url: r.html_url,
  }))

  let res: Response
  try {
    res = await fetch(DEEPSEEK_API, {
      method: "POST",
      signal: AbortSignal.timeout(45_000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        max_tokens: 2000,
        messages: [
          { role: "system", content: REPO_CLASSIFY_SYSTEM },
          { role: "user", content: JSON.stringify(input) },
        ],
        response_format: { type: "json_object" },
      }),
    })
  } catch (e) {
    return {
      results: repos.map((r) => fallbackClassification(r)),
      error: `Network error: ${String(e)}`,
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    return {
      results: repos.map((r) => fallbackClassification(r)),
      error: `DeepSeek ${res.status}: ${body.slice(0, 200)}`,
    }
  }

  let json: unknown
  try { json = await res.json() } catch {
    return {
      results: repos.map((r) => fallbackClassification(r)),
      error: "DeepSeek response was not valid JSON",
    }
  }

  const content = (json as any)?.choices?.[0]?.message?.content ?? ""
  const stripped = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  let parsed: unknown
  try { parsed = JSON.parse(stripped) } catch {
    return {
      results: repos.map((r) => fallbackClassification(r)),
      error: `Could not parse DeepSeek response: ${stripped.slice(0, 200)}`,
    }
  }

  const raw = (parsed as any)?.results
  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      results: repos.map((r) => fallbackClassification(r)),
      error: `Unexpected shape from DeepSeek: ${JSON.stringify(parsed).slice(0, 200)}`,
    }
  }

  // Zip results back — if DeepSeek returned fewer items, fill gaps with fallback
  const results: RepoClassification[] = repos.map((r, i) => {
    const c = raw[i]
    if (!c || typeof c !== "object") return fallbackClassification(r)
    return {
      name: String(c.name ?? r.name),
      eco: String(c.eco ?? "") || inferEcoFromRepo(r.topics, r.name, r.description ?? ""),
      href: String(c.href ?? r.html_url),
      note: String(c.note ?? ""),
      topics: (Array.isArray(c.topics) && c.topics.length > 0) ? c.topics.map(String) : deriveTopicsFromRepo(r),
      maintainerFriendliness: Number(c.maintainerFriendliness ?? 0.5),
      issueQuality: Number(c.issueQuality ?? 0.5),
      beginnerSuitability: Number(c.beginnerSuitability ?? 0.5),
      maintainerLabel: String(c.maintainerLabel ?? ""),
      issueLabel: String(c.issueLabel ?? ""),
      beginnerLabel: String(c.beginnerLabel ?? ""),
      ecosystem: Array.isArray(c.ecosystem) ? c.ecosystem.map(String) : [],
      activityTier: (["active", "maintenance", "dormant"].includes(c.activityTier) ? c.activityTier : "maintenance") as RepoClassification["activityTier"],
      beginnerFriendly: Boolean(c.beginnerFriendly),
      stars: r.stargazers_count,
      pushedAt: r.pushed_at,
      queue: c.queue !== false,
      skipReason: String(c.skipReason ?? ""),
    }
  })

  return { results }
}

export function inferEcoFromRepo(topics: string[], name: string, description: string): string {
  const lc = [topics.join(" "), name, description].join(" ").toLowerCase()
  if (lc.includes("tui") || lc.includes("terminal")) return "UI · TUI"
  if (lc.includes("cli") || lc.includes("command-line")) return "CLI · Tooling"
  if (lc.includes("embedded") || lc.includes("no_std") || lc.includes("embassy") || lc.includes("rtos")) return "Embedded · no_std"
  if (lc.includes("parser") || lc.includes("parsing") || lc.includes("nom") || lc.includes("pest")) return "Parsing · Libraries"
  if (lc.includes("wasm") || lc.includes("webassembly") || lc.includes("wasmtime")) return "WASM · Runtime"
  if (lc.includes("crypto") || lc.includes("security") || lc.includes("tls") || lc.includes("cipher")) return "Security · Crypto"
  if (lc.includes("game") || lc.includes("bevy") || lc.includes("engine") || lc.includes("rendering")) return "Game · Graphics"
  if (lc.includes("http") || lc.includes("axum") || lc.includes("actix") || lc.includes("web server")) return "Web · HTTP"
  if (lc.includes("database") || lc.includes("sql") || lc.includes("diesel") || lc.includes("sqlx")) return "Database · Storage"
  if (lc.includes("async") || lc.includes("tokio") || lc.includes("futures") || lc.includes("runtime")) return "Async · Runtime"
  if (lc.includes("network") || lc.includes("socket") || lc.includes("hyper") || lc.includes("grpc") || lc.includes("tonic")) return "Networking"
  return "Libraries · General"
}

export function deriveTopicsFromRepo(r: RepoInput): string[] {
  const lc = [r.topics.join(" "), r.name, r.description ?? ""].join(" ").toLowerCase()
  const tags: string[] = []
  const checks: [string, string][] = [
    ["tokio", "tokio"], ["axum", "axum"], ["actix", "actix"], ["hyper", "hyper"], ["tonic", "tonic"],
    ["async", "async"], ["futures", "async"], ["embassy", "embassy"], ["embedded", "embedded"],
    ["no_std", "no_std"], ["wasm", "wasm"], ["webassembly", "wasm"], ["cli", "cli"],
    ["parser", "parser"], ["parsing", "parser"], ["database", "database"], ["sql", "sql"],
    ["crypto", "crypto"], ["security", "security"], ["tls", "tls"], ["bevy", "bevy"],
    ["game", "game"], ["web", "web"], ["http", "http"], ["grpc", "grpc"],
    ["serde", "serde"], ["rayon", "rayon"], ["tower", "tower"], ["tracing", "tracing"],
  ]
  for (const [keyword, tag] of checks) {
    if (lc.includes(keyword) && !tags.includes(tag)) tags.push(tag)
  }
  // Also keep any GitHub topics set on the repo
  for (const t of r.topics) {
    if (!tags.includes(t)) tags.push(t)
  }
  return tags.slice(0, 5)
}

function fallbackClassification(r: RepoInput): RepoClassification {
  const eco = inferEcoFromRepo(r.topics, r.name, r.description ?? "")
  return {
    name: r.name,
    eco,
    href: r.html_url,
    note: r.description ?? "",
    topics: deriveTopicsFromRepo(r),
    maintainerFriendliness: 0.5,
    issueQuality: 0.5,
    beginnerSuitability: 0.5,
    maintainerLabel: "Unknown",
    issueLabel: `${r.open_issues_count} open issues`,
    beginnerLabel: "Review manually",
    ecosystem: [],
    activityTier: "maintenance",
    beginnerFriendly: false,
    stars: r.stargazers_count,
    pushedAt: r.pushed_at,
    queue: true,
    skipReason: "",
  }
}

// ── Text extraction (jobs/oss/grants/pulse/events/companies) ──────────────────

export async function extractWithDeepSeek(
  type: ContentType,
  rawText: string
): Promise<ExtractionResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  // Structured key diagnostics — safe to log (shows only first 8 chars)
  if (!apiKey) {
    return {
      ok: false,
      error: "DEEPSEEK_API_KEY is not set. Add it to .env.local and restart the dev server.",
    }
  }

  const systemPrompt = PROMPTS[type]
  if (!systemPrompt) {
    return { ok: false, error: `No extraction prompt for content type: ${type}` }
  }

  const requestBody = {
    model: MODEL,
    temperature: 0.1,
    max_tokens: 800,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: rawText.slice(0, 4000) },
    ],
    // response_format forces JSON output. DeepSeek supports this when the word "JSON"
    // appears in the system prompt, which our prompts satisfy.
    response_format: { type: "json_object" },
  }

  let res: Response
  try {
    res = await fetch(DEEPSEEK_API, {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })
  } catch (fetchErr) {
    return {
      ok: false,
      error: `Network error reaching DeepSeek API: ${String(fetchErr)}`,
    }
  }

  if (!res.ok) {
    let errBody = ""
    try { errBody = await res.text() } catch { /* ignore */ }

    // Classify common failure modes
    if (res.status === 401) {
      return { ok: false, error: `DeepSeek: Invalid API key (401). Check DEEPSEEK_API_KEY in .env.local.` }
    }
    if (res.status === 402) {
      return { ok: false, error: `DeepSeek: Insufficient balance (402). Add credits at platform.deepseek.com.` }
    }
    if (res.status === 429) {
      return { ok: false, error: `DeepSeek: Rate limited (429). Wait a moment and retry.` }
    }
    if (res.status === 400) {
      return { ok: false, error: `DeepSeek: Bad request (400): ${errBody.slice(0, 300)}` }
    }
    return { ok: false, error: `DeepSeek API ${res.status}: ${errBody.slice(0, 300)}` }
  }

  let json: unknown
  try {
    json = await res.json()
  } catch {
    const raw = await res.text().catch(() => "(could not read body)")
    return { ok: false, error: `DeepSeek response was not valid JSON. Raw: ${raw.slice(0, 200)}` }
  }

  const content = (json as any)?.choices?.[0]?.message?.content
  if (!content) {
    const reason = (json as any)?.choices?.[0]?.finish_reason
    return {
      ok: false,
      error: `DeepSeek returned no content. finish_reason=${reason ?? "unknown"}. Full response: ${JSON.stringify(json).slice(0, 300)}`,
    }
  }

  // The model should return raw JSON (enforced by response_format).
  // If it wraps in markdown, strip the fences as a fallback.
  const stripped = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch {
    return {
      ok: false,
      error: `DeepSeek returned non-JSON content: ${stripped.slice(0, 300)}`,
    }
  }

  return { ok: true, data: parsed as Record<string, unknown> }
}
