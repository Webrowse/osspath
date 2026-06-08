"use server"

import { revalidatePath } from "next/cache"
import { readPending, writePending, archiveItem, appendContent, readContent, writeContent } from "./storage"
import type { ContentType, PendingItem } from "./types"
import { auth } from "@/lib/auth"

async function requireAdmin() {
  const session = await auth()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || session?.user?.email !== adminEmail) {
    throw new Error("Unauthorized")
  }
}

// ── Approve ───────────────────────────────────────────────────────────────────

export async function approveItem(
  type: ContentType,
  id: string,
  overrides?: Record<string, unknown>
) {
  await requireAdmin()
  const pending = readPending(type)
  const item = pending.find((p) => p.id === id)
  if (!item) throw new Error(`Pending item not found: ${id}`)

  const today = new Date().toISOString().split("T")[0]
  const published: Record<string, unknown> = {
    ...item.extracted,
    ...overrides,
    checkedAt: today,
  }

  // Jobs require expiresAt
  if (type === "jobs" && !published.expiresAt) {
    const expiry = new Date()
    expiry.setMonth(expiry.getMonth() + 3)
    published.expiresAt = expiry.toISOString().split("T")[0]
  }

  appendContent(type, published)
  writePending(type, pending.filter((p) => p.id !== id))
  archiveItem(type, { ...item, status: "approved" })

  revalidatePath("/admin/queue")
  revalidatePath("/admin/published")
  revalidatePath("/")
}

// ── Reject ────────────────────────────────────────────────────────────────────

export async function rejectItem(type: ContentType, id: string) {
  await requireAdmin()
  const pending = readPending(type)
  const item = pending.find((p) => p.id === id)
  if (!item) throw new Error(`Pending item not found: ${id}`)

  writePending(type, pending.filter((p) => p.id !== id))
  archiveItem(type, { ...item, status: "rejected" })

  revalidatePath("/admin/queue")
}

// ── Bulk approve / reject ─────────────────────────────────────────────────────

export async function approveAll(type: ContentType) {
  await requireAdmin()
  const pending = readPending(type)
  if (pending.length === 0) return

  const today = new Date().toISOString().split("T")[0]
  const expiry = new Date()
  expiry.setMonth(expiry.getMonth() + 3)
  const expiresAt = expiry.toISOString().split("T")[0]

  for (const item of pending) {
    const published: Record<string, unknown> = {
      ...item.extracted,
      checkedAt: today,
    }
    if (type === "jobs" && !published.expiresAt) {
      published.expiresAt = expiresAt
    }
    appendContent(type, published)
    archiveItem(type, { ...item, status: "approved" })
  }
  writePending(type, [])

  revalidatePath("/admin/queue")
  revalidatePath("/admin/published")
  revalidatePath("/")
}

export async function rejectAll(type: ContentType) {
  await requireAdmin()
  const pending = readPending(type)
  if (pending.length === 0) return

  for (const item of pending) {
    archiveItem(type, { ...item, status: "rejected" })
  }
  writePending(type, [])

  revalidatePath("/admin/queue")
}

// ── Manual add to pending ─────────────────────────────────────────────────────

export async function addManualPending(
  type: ContentType,
  sourceUrl: string,
  extracted: Record<string, unknown>
) {
  await requireAdmin()
  const { addPendingItems } = await import("./storage")
  const item: PendingItem = {
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    status: "pending",
    source: "manual",
    sourceUrl,
    foundAt: new Date().toISOString(),
    confidence: undefined,
    rawText: undefined,
    extracted,
  }
  addPendingItems(type, [item])
  revalidatePath("/admin/queue")
}

// ── Delete published ──────────────────────────────────────────────────────────

export async function deletePublished(type: ContentType, index: number) {
  await requireAdmin()
  const { removeContent } = await import("./storage")
  removeContent(type, index)
  revalidatePath("/admin/published")
  revalidatePath("/")
}

export async function deleteAllPublished(type: ContentType) {
  await requireAdmin()
  writeContent(type, [])
  revalidatePath("/admin/published")
  revalidatePath("/")
}

// ── AI extraction (server-side, safe env access) ─────────────────────────────

export async function extractWithAI(
  type: ContentType,
  text: string
) {
  await requireAdmin()
  const { extractWithDeepSeek } = await import("./deepseek")
  return extractWithDeepSeek(type, text)
}

// ── DeepSeek diagnostic (isolated API test) ───────────────────────────────────

export async function runDeepSeekDiagnostic(): Promise<string> {
  await requireAdmin()
  const apiKey = process.env.DEEPSEEK_API_KEY
  const lines: string[] = []

  lines.push("=== DeepSeek Diagnostic ===")
  lines.push(`Timestamp:  ${new Date().toISOString()}`)
  lines.push(`Key set:    ${apiKey ? "YES" : "NO — set DEEPSEEK_API_KEY in .env.local"}`)
  if (apiKey) {
    lines.push(`Key prefix: ${apiKey.slice(0, 8)}…`)
  }
  lines.push("")

  if (!apiKey) {
    lines.push("STOP: Cannot test without API key.")
    return lines.join("\n")
  }

  const endpoint = "https://api.deepseek.com/v1/chat/completions"
  lines.push(`Endpoint:   ${endpoint}`)
  lines.push(`Model:      deepseek-chat`)
  lines.push("")
  lines.push("Sending minimal test message: \"Say hello\"")
  lines.push("")

  let res: Response
  const start = Date.now()
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0,
        max_tokens: 20,
        messages: [{ role: "user", content: "Say the word hello" }],
      }),
    })
  } catch (err) {
    lines.push(`FETCH ERROR: ${String(err)}`)
    return lines.join("\n")
  }

  const elapsed = Date.now() - start
  lines.push(`HTTP status:  ${res.status} ${res.statusText}`)
  lines.push(`Elapsed:      ${elapsed}ms`)

  const body = await res.text().catch(() => "(could not read body)")
  lines.push("")
  lines.push("Raw response:")
  lines.push(body.slice(0, 1000))

  if (res.ok) {
    try {
      const json = JSON.parse(body)
      const content = json?.choices?.[0]?.message?.content
      lines.push("")
      lines.push(`Parsed content: ${content ?? "(none)"}`)
      lines.push("")
      lines.push("✓ API is working correctly.")
    } catch {
      lines.push("")
      lines.push("Response was not valid JSON — check the raw output above.")
    }
  } else {
    lines.push("")
    if (res.status === 401) lines.push("✗ 401 — Invalid API key.")
    else if (res.status === 402) lines.push("✗ 402 — Insufficient balance. Add credits at platform.deepseek.com.")
    else if (res.status === 429) lines.push("✗ 429 — Rate limited.")
    else lines.push(`✗ ${res.status} — See raw response above.`)
  }

  return lines.join("\n")
}

// ── Update published item ─────────────────────────────────────────────────────

export async function updatePublished(
  type: ContentType,
  index: number,
  patch: Record<string, unknown>
) {
  await requireAdmin()
  const { readContent, writeContent } = await import("./storage")
  const items = readContent(type)
  if (index < 0 || index >= items.length) throw new Error("Index out of range")
  const updated = items.map((item, i) =>
    i === index ? { ...item, ...patch, checkedAt: new Date().toISOString().split("T")[0] } : item
  )
  writeContent(type, updated)
  revalidatePath("/admin/published")
  revalidatePath("/")
}

// ── Update pending item (pre-approve edit) ────────────────────────────────────

export async function updatePendingItem(
  type: ContentType,
  id: string,
  patch: Record<string, unknown>
) {
  await requireAdmin()
  const pending = readPending(type)
  const updated = pending.map((p) =>
    p.id === id ? { ...p, extracted: { ...p.extracted, ...patch } } : p
  )
  writePending(type, updated)
  revalidatePath("/admin/queue")
}
