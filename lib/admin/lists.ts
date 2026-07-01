import { prisma } from "@/lib/prisma"

/**
 * Allow / block lists. Checked before expensive work so unwanted content never
 * re-enters the pipeline. The blocklist is the single source of truth for
 * "never process this again": it is grown manually and automatically (the
 * reviewer blocklists spam it rejects).
 */

export type ListKind = "allow" | "block"
export type ListTarget =
  | "repo"
  | "company"
  | "domain"
  | "url"
  | "org"
  | "topic"
  | "keyword"
  | "author"

export type ListEntryRow = {
  id: string
  kind: ListKind
  target: ListTarget
  value: string
  reason: string | null
  source: string | null
  createdAt: Date
}

function toRow(r: {
  id: string; kind: string; target: string; value: string;
  reason: string | null; source: string | null; createdAt: Date;
}): ListEntryRow {
  return {
    id: r.id,
    kind: r.kind as ListKind,
    target: r.target as ListTarget,
    value: r.value,
    reason: r.reason,
    source: r.source,
    createdAt: r.createdAt,
  }
}

/** Normalise a URL for comparison: drop scheme, www., trailing slash, lowercase. */
export function normalizeUrl(u: string): string {
  try {
    const url = new URL(u)
    return (url.hostname.replace(/^www\./, "") + url.pathname).replace(/\/+$/, "").toLowerCase()
  } catch {
    return u.toLowerCase().replace(/\/+$/, "")
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listEntries(kind?: ListKind, target?: ListTarget): Promise<ListEntryRow[]> {
  const rows = await prisma.listEntry.findMany({
    where: { ...(kind ? { kind } : {}), ...(target ? { target } : {}) },
    orderBy: [{ kind: "asc" }, { target: "asc" }, { value: "asc" }],
  })
  return rows.map(toRow)
}

export async function addEntry(input: {
  kind: ListKind
  target: ListTarget
  value: string
  reason?: string | null
  source?: string | null
}): Promise<void> {
  const value = input.target === "url" ? normalizeUrl(input.value) : input.value.trim().toLowerCase()
  await prisma.listEntry.upsert({
    where: { kind_target_value: { kind: input.kind, target: input.target, value } },
    create: { kind: input.kind, target: input.target, value, reason: input.reason ?? null, source: input.source ?? "manual" },
    update: { reason: input.reason ?? null },
  })
}

export async function removeEntry(id: string): Promise<void> {
  await prisma.listEntry.delete({ where: { id } })
}

/** Convenience for the reviewer: permanently block a rejected URL. */
export async function blockUrl(url: string, reason: string): Promise<void> {
  await addEntry({ kind: "block", target: "url", value: url, reason, source: "reviewer" })
}

// ── Guard ─────────────────────────────────────────────────────────────────────

export type Blocklist = {
  urls: Set<string>
  domains: Set<string>
  orgs: Set<string>
  repos: Set<string>
  companies: Set<string>
  topics: Set<string>
  keywords: string[]
  authors: Set<string>
}

/** Load all block entries once and index them for fast lookups during a run. */
export async function loadBlocklist(): Promise<Blocklist> {
  const rows = await prisma.listEntry.findMany({ where: { kind: "block" } })
  const bl: Blocklist = {
    urls: new Set(), domains: new Set(), orgs: new Set(), repos: new Set(),
    companies: new Set(), topics: new Set(), keywords: [], authors: new Set(),
  }
  for (const r of rows) {
    const v = r.value.toLowerCase()
    switch (r.target) {
      case "url":     bl.urls.add(normalizeUrl(r.value)); break
      case "domain":  bl.domains.add(v.replace(/^www\./, "")); break
      case "org":     bl.orgs.add(v); break
      case "repo":    bl.repos.add(v); break
      case "company": bl.companies.add(v); break
      case "topic":   bl.topics.add(v); break
      case "keyword": bl.keywords.push(v); break
      case "author":  bl.authors.add(v); break
    }
  }
  return bl
}

export type BlockCheck = {
  url?: string
  company?: string
  topics?: string[]
  author?: string
  text?: string
}

/** True if a candidate is blocked. Called before expensive work (fetch, AI). */
export function isBlocked(bl: Blocklist, input: BlockCheck): boolean {
  if (input.url) {
    const norm = normalizeUrl(input.url)
    if (bl.urls.has(norm)) return true
    try {
      const host = new URL(input.url).hostname.replace(/^www\./, "").toLowerCase()
      if (bl.domains.has(host)) return true
      // GitHub owner/repo → org and repo checks
      const m = input.url.match(/github\.com\/([^/]+)\/([^/?#]+)/i)
      if (m) {
        const org = m[1].toLowerCase()
        const repo = `${m[1]}/${m[2]}`.toLowerCase()
        if (bl.orgs.has(org)) return true
        if (bl.repos.has(repo)) return true
      }
    } catch { /* non-URL href: skip host checks */ }
  }
  if (input.company && bl.companies.has(input.company.trim().toLowerCase())) return true
  if (input.author && bl.authors.has(input.author.trim().toLowerCase())) return true
  if (input.topics && input.topics.some((t) => bl.topics.has(t.trim().toLowerCase()))) return true
  if (input.text && bl.keywords.length > 0) {
    const hay = input.text.toLowerCase()
    if (bl.keywords.some((k) => hay.includes(k))) return true
  }
  return false
}
