import type { ContentType } from "./types"
import { readContent } from "./storage"

/**
 * Resource library: one normalised view over the external-link content types.
 * The public site keeps its per-type snapshots (pulse.json, learning.json,
 * portals.json, grants.json, events.json); the admin edits them through four
 * editorial categories instead of five storage buckets.
 */

export type ResourceCategory = "stay-updated" | "learn-deeply" | "opportunities" | "events"

export const RESOURCE_CATEGORIES: Record<ResourceCategory, {
  label: string
  description: string
  types: ContentType[]
  kinds: string[] // suggested `kind` values when adding
}> = {
  "stay-updated": {
    label: "Stay Updated",
    description: "Newsletters, blogs, and podcasts that track the ecosystem",
    types: ["pulse"],
    kinds: ["Newsletter", "Blog", "Podcast", "YouTube"],
  },
  "learn-deeply": {
    label: "Learn Deeply",
    description: "Courses, books, and videos worth the hours",
    types: ["learning"],
    kinds: ["Book", "Course", "Video", "Guide"],
  },
  "opportunities": {
    label: "Opportunities",
    description: "Job boards and funding programs",
    types: ["portals", "grants"],
    kinds: ["Job board", "Funding"],
  },
  "events": {
    label: "Events",
    description: "Conferences and meetups",
    types: ["events"],
    kinds: ["Conference", "Meetup"],
  },
}

export type ResourceRow = {
  type: ContentType   // storage bucket the row lives in
  href: string        // identity within its type
  title: string
  kind: string
  description: string
  tags: string[]
  meta: string        // type-specific extra (event date, grant status)
}

type Raw = Record<string, unknown>

function str(v: unknown): string {
  return typeof v === "string" ? v : ""
}

function normalize(type: ContentType, item: Raw): ResourceRow | null {
  const href = str(item.href)
  if (!href) return null
  switch (type) {
    case "pulse":
    case "learning":
      return { type, href, title: str(item.title), kind: str(item.kind), description: str(item.description), tags: [], meta: "" }
    case "portals":
      return { type, href, title: str(item.name), kind: str(item.kind) || "Job board", description: str(item.description), tags: (item.tags as string[]) ?? [], meta: "" }
    case "grants":
      return { type, href, title: str(item.name), kind: str(item.kind) || "Funding", description: str(item.description), tags: [], meta: str(item.status) }
    case "events":
      return { type, href, title: str(item.title), kind: "Event", description: str(item.meta), tags: [], meta: [str(item.day), str(item.month)].filter(Boolean).join(" ") }
    default:
      return null
  }
}

export async function getResources(category: ResourceCategory): Promise<ResourceRow[]> {
  const { types } = RESOURCE_CATEGORIES[category]
  const rows: ResourceRow[] = []
  for (const type of types) {
    const items = await readContent(type)
    for (const item of items) {
      const row = normalize(type, item)
      if (row) rows.push(row)
    }
  }
  return rows
}
