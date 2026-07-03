import type { ContentType } from "./types"

/**
 * Executable per-type behavior, kept separate from CONTENT_SCHEMA's static
 * metadata (see content-schema.ts for why). Currently just how to summarise
 * an item as a list row in /admin/published; grows independently of the
 * schema as new rendering needs appear.
 */

export type ContentBehavior = {
  listLabel: (item: Record<string, unknown>) => string
  listMeta: (item: Record<string, unknown>) => string
}

export const CONTENT_BEHAVIOR: Record<ContentType, ContentBehavior> = {
  jobs: {
    listLabel: (item) => `${item.role ?? "?"} — ${item.company ?? "?"}`,
    listMeta: (item) => [item.checkedAt, item.expiresAt ? `exp ${item.expiresAt}` : ""].filter(Boolean).join(" · "),
  },
  oss: {
    listLabel: (item) => String(item.name ?? "?"),
    listMeta: (item) => String(item.eco ?? ""),
  },
  grants: {
    listLabel: (item) => String(item.name ?? item.title ?? "?"),
    listMeta: (item) => String(item.status ?? ""),
  },
  pulse: {
    listLabel: (item) => String(item.title ?? item.name ?? "?"),
    listMeta: (item) => String(item.kind ?? ""),
  },
  events: {
    listLabel: (item) => String(item.name ?? item.title ?? "?"),
    listMeta: (item) => String(item.meta ?? ""),
  },
  companies: {
    listLabel: (item) => String(item.name ?? "?"),
    listMeta: (item) => String(item.sector ?? ""),
  },
  portals: {
    listLabel: (item) => String(item.title ?? item.name ?? "?"),
    listMeta: (item) => String(item.kind ?? ""),
  },
  news: {
    listLabel: (item) => String(item.title ?? "?"),
    listMeta: (item) => [item.kind, item.date].filter(Boolean).join(" · "),
  },
  authors: {
    listLabel: (item) => String(item.name ?? "?"),
    listMeta: (item) => String(item.handle ?? ""),
  },
  learning: {
    listLabel: (item) => String(item.title ?? "?"),
    listMeta: (item) => String(item.kind ?? ""),
  },
  funders: {
    listLabel: (item) => String(item.name ?? "?"),
    listMeta: (item) => String(item.kind ?? ""),
  },
}
