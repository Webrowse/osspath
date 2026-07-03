import { createHash } from "crypto"
import type { ContentType } from "@/lib/admin/types"
import { CONTENT_TYPES } from "@/lib/admin/content-schema"
import { readPublished } from "./store"

/**
 * Deterministic snapshot of published content, materialised from PostgreSQL.
 *
 * PostgreSQL is the source of truth; this module projects it into the exact
 * bytes that get committed to Git (one content/<type>.json per type). The
 * output must be byte-stable for identical DB state, or the publish step would
 * create spurious commits. Determinism comes from two things:
 *   1. A stable row order - readPublished() orders by (createdAt, id).
 *   2. Canonical serialisation - object keys sorted recursively, fixed
 *      indentation, trailing newline. jsonb does not preserve key order, so we
 *      normalise it here.
 *
 * This is the single export implementation. It is imported by the pipeline
 * (server action) and by scripts/export-snapshot.ts (CLI). It reads the DB
 * lazily via the shared Prisma client; importing it opens no connection.
 */

export type SnapshotFile = { path: string; content: string }

/**
 * Content types included in the published snapshot, in fixed order (the
 * registry order from CONTENT_SCHEMA). This order is also the canonical order
 * used when a hash of the whole snapshot is computed downstream.
 */
export const SNAPSHOT_TYPES: ContentType[] = CONTENT_TYPES

/** Recursively sort object keys so serialisation is independent of key order. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) out[key] = canonicalize(source[key])
    return out
  }
  return value
}

/** Canonical JSON bytes for a value: sorted keys, 2-space indent, trailing newline. */
export function serialize(value: unknown): string {
  return JSON.stringify(canonicalize(value), null, 2) + "\n"
}

/**
 * SHA-256 over the snapshot's canonical bytes (path + content, in file order).
 * Used by the publish step to decide "did anything change?" by comparing the
 * generated snapshot to the one currently in Git - order matters and is fixed
 * by SNAPSHOT_TYPES, so equal content always yields an equal hash.
 */
export function snapshotSha256(files: SnapshotFile[]): string {
  const hash = createHash("sha256")
  for (const file of files) {
    hash.update(file.path)
    hash.update("\0")
    hash.update(file.content)
    hash.update("\0")
  }
  return hash.digest("hex")
}

/**
 * Build the full snapshot in memory from current PostgreSQL state. Fail-closed:
 * all types are read before returning, so a read failure throws and the caller
 * writes/commits nothing. Never returns a partial snapshot.
 */
export async function exportSnapshot(): Promise<SnapshotFile[]> {
  const files: SnapshotFile[] = []
  for (const type of SNAPSHOT_TYPES) {
    const items = await readPublished(type)
    files.push({ path: `content/${type}.json`, content: serialize(items) })
  }
  return files
}
