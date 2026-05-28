import type { ContentType, ExtractionResult } from "./types"

// DeepSeek uses the OpenAI-compatible path. The /v1/ prefix is optional but accepted.
const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions"
const MODEL = "deepseek-chat"

const PROMPTS: Record<ContentType, string> = {
  jobs: `You are a structured data extractor. Return ONLY valid JSON with no markdown.

Extract a Rust job listing from the text. Return a JSON object with:
company (string), role (string), href (string — apply URL or careers page), note (string — 1-2 factual sentences about the role), tags (string[] — e.g. ["Remote", "EU"]), topics (string[] — e.g. ["infra", "backend"]), rustMentioned (boolean — true if Rust is explicitly named), remoteConfirmed (boolean).

Omit fields you cannot determine. Do not invent information.`,

  oss: `You are a structured data extractor. Return ONLY valid JSON with no markdown.

Extract an open source Rust project. Return a JSON object with:
name (string), eco (string — short category like "CLI · Tooling"), href (string — GitHub URL), note (string — 1 factual sentence about contribution environment), topics (string[] — e.g. ["cli", "parser"]), maintainerFriendliness (number 0-1), issueQuality (number 0-1), beginnerSuitability (number 0-1), maintainerLabel (string), issueLabel (string), beginnerLabel (string).`,

  grants: `You are a structured data extractor. Return ONLY valid JSON with no markdown.

Extract a grant/bounty/sponsorship for Rust work. Return a JSON object with:
kind (one of: "Grant", "Bounty", "Hackathon", "Sponsorship"), name (string), description (string — 1 sentence), status (string — e.g. "Open"), href (string).`,

  pulse: `You are a structured data extractor. Return ONLY valid JSON with no markdown.

Extract an ecosystem resource. Return a JSON object with:
kind (one of: "Newsletter", "Forum", "Blog", "Community", "Podcast"), title (string), description (string — 1 sentence), href (string).`,

  events: `You are a structured data extractor. Return ONLY valid JSON with no markdown.

Extract a Rust event. Return a JSON object with:
title (string), day (string — day number or "—" for recurring), month (string — abbreviated like "Jun" or period like "Monthly"), meta (string — format/cost), href (string), recurring (boolean).`,

  companies: `You are a structured data extractor. Return ONLY valid JSON with no markdown.

Extract a company using Rust in production. Return a JSON object with:
name (string), sector (string — short like "Storage"), href (string — company website).`,
}

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
  } catch (parseErr) {
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
