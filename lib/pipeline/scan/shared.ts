/**
 * Shared deterministic helpers used by the scanner cores. Pure functions only —
 * no auth, no persistence, no AI.
 */

export function sleep(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export function decodeHTML(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .replace(/<p>/g, "\n")
    .replace(/<br\s*\/?>/g, "\n")
}

export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}

/** Deterministic best-effort extraction of job signals from free-form text. */
export function extractMinimalJob(text: string): Record<string, unknown> {
  const lower = text.toLowerCase()
  return {
    note: text.slice(0, 200).trim(),
    rustMentioned: lower.includes("rust"),
    remoteConfirmed: /\bremote\b/i.test(text),
    tags: [
      ...(/\bremote\b/i.test(text) ? ["Remote"] : []),
      ...(lower.includes("eu") || lower.includes("europe") ? ["EU"] : []),
      ...(/\bus\b|\bunited states\b/i.test(text) ? ["US"] : []),
      ...(/\bjunior\b/i.test(text) ? ["Junior-friendly"] : []),
    ].slice(0, 3),
    topics: [
      ...(lower.includes("embedded") ? ["embedded"] : []),
      ...(lower.includes("wasm") || lower.includes("webassembly") ? ["wasm"] : []),
      ...(lower.includes("backend") ? ["backend"] : []),
      ...(lower.includes("infra") ? ["infra"] : []),
      ...(lower.includes("crypto") || lower.includes("blockchain") ? ["blockchain"] : []),
    ].slice(0, 3),
  }
}

export function estimateConfidence(extracted: Record<string, unknown>): number {
  let score = 0.3
  if (extracted.company) score += 0.15
  if (extracted.role) score += 0.15
  if (extracted.href) score += 0.2
  if (extracted.rustMentioned) score += 0.1
  if (extracted.remoteConfirmed) score += 0.1
  return Math.min(score, 1)
}
