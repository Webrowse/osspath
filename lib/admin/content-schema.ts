import type { ContentType } from "./types"

/**
 * Single declarative source of truth for every published content type:
 * registration, labels, snapshot filenames, and admin form fields. Every
 * consumer (admin nav, published tabs, storage, the Git snapshot export, the
 * edit form) reads from CONTENT_SCHEMA instead of keeping its own parallel
 * list in sync by hand.
 *
 * Pure metadata only - no functions. Keeping this file data-only is what
 * makes future tooling (schema export, validation, docs, localization)
 * possible without touching rendering code. Executable per-type behavior
 * (how to summarise an item for a list row) lives in content-behavior.ts.
 */

export type FieldKind = "text" | "textarea" | "tags"

export type FieldConfig = {
  key: string
  label: string
  kind: FieldKind
}

export type ContentTypeSchema = {
  label: string   // display label - admin nav, published tabs, page titles
  file: string     // content/<file>.json stem
  fields: FieldConfig[] // drives the admin edit form
}

export const CONTENT_SCHEMA: Record<ContentType, ContentTypeSchema> = {
  jobs: {
    label: "Jobs",
    file: "jobs",
    fields: [
      { key: "company", label: "Company", kind: "text" },
      { key: "role", label: "Role", kind: "text" },
      { key: "href", label: "URL", kind: "text" },
      { key: "checkedAt", label: "Checked At", kind: "text" },
      { key: "expiresAt", label: "Expires At", kind: "text" },
      { key: "note", label: "Note", kind: "textarea" },
    ],
  },
  oss: {
    label: "Repos",
    file: "oss",
    fields: [
      { key: "name", label: "Name", kind: "text" },
      { key: "eco", label: "Eco", kind: "text" },
      { key: "href", label: "URL", kind: "text" },
      { key: "note", label: "Note", kind: "textarea" },
    ],
  },
  grants: {
    label: "Funding",
    file: "grants",
    fields: [
      { key: "kind", label: "Kind", kind: "text" },
      { key: "name", label: "Name", kind: "text" },
      { key: "href", label: "URL", kind: "text" },
      { key: "status", label: "Status", kind: "text" },
      { key: "description", label: "Description", kind: "textarea" },
    ],
  },
  pulse: {
    label: "Pulse",
    file: "pulse",
    fields: [
      { key: "kind", label: "Kind", kind: "text" },
      { key: "title", label: "Title", kind: "text" },
      { key: "href", label: "URL", kind: "text" },
      { key: "description", label: "Description", kind: "textarea" },
    ],
  },
  events: {
    label: "Events",
    file: "events",
    fields: [
      { key: "title", label: "Title", kind: "text" },
      { key: "day", label: "Day", kind: "text" },
      { key: "month", label: "Month / Period", kind: "text" },
      { key: "href", label: "URL", kind: "text" },
      { key: "meta", label: "Meta", kind: "text" },
      { key: "expiresAt", label: "Expires At", kind: "text" },
    ],
  },
  companies: {
    label: "Companies",
    file: "companies",
    fields: [
      { key: "name", label: "Name", kind: "text" },
      { key: "sector", label: "Sector", kind: "text" },
      { key: "href", label: "URL", kind: "text" },
    ],
  },
  portals: {
    label: "Job Portals",
    file: "portals",
    fields: [
      { key: "name", label: "Name", kind: "text" },
      { key: "kind", label: "Kind", kind: "text" },
      { key: "href", label: "URL", kind: "text" },
      { key: "description", label: "Description", kind: "textarea" },
    ],
  },
  news: {
    label: "News",
    file: "news",
    fields: [
      { key: "title", label: "Title", kind: "text" },
      { key: "href", label: "URL", kind: "text" },
      { key: "kind", label: "Kind", kind: "text" },
      { key: "date", label: "Date (YYYY-MM-DD)", kind: "text" },
      { key: "source", label: "Source", kind: "text" },
      { key: "blurb", label: "Blurb", kind: "textarea" },
    ],
  },
  authors: {
    label: "Authors",
    file: "authors",
    fields: [
      { key: "name", label: "Name", kind: "text" },
      { key: "handle", label: "Handle", kind: "text" },
      { key: "href", label: "URL", kind: "text" },
      { key: "writing", label: "Writing URL", kind: "text" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "tags", label: "Tags", kind: "tags" },
    ],
  },
}

/** Every registered content type, in registry order. Replaces the ~7 hand-kept copies of this same list. */
export const CONTENT_TYPES: ContentType[] = Object.keys(CONTENT_SCHEMA) as ContentType[]
