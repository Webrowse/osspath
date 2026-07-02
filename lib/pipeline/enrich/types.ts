import type { RepoRef, DirEntry } from "./github-files"

export type { RepoRef, DirEntry }

/**
 * Input handed to every enricher: the repo ref, the candidate's existing scanned
 * fields, and fail-closed file/dir readers. readFile/listDir return null/[] for a
 * confirmed-absent path but THROW on uncertainty, so an enricher can fail closed.
 */
export type EnrichInput = {
  ref: RepoRef
  base: Readonly<Record<string, unknown>>
  readFile: (path: string) => Promise<string | null>
  listDir: (path: string) => Promise<DirEntry[]>
}

export type EnricherResult =
  | { ok: true; data: Record<string, unknown>; notes?: string[] }
  | { ok: false; error: string }

/**
 * One composable enrichment step. `required` enrichers hold a repo back from
 * publish when they fail (the "no repo reaches production unenriched" rule);
 * optional enrichers only add a note and are skipped. `acc` is the merged output
 * of earlier enrichers, so a later enricher (e.g. ecosystem inference) can build
 * on an earlier one (e.g. cargo dependencies) without refetching.
 */
export interface Enricher {
  readonly name: string
  readonly required: boolean
  run(input: EnrichInput, acc: Readonly<Record<string, unknown>>): Promise<EnricherResult>
}

/** The accumulated enrichment stored on a repo record: provenance + namespaced fragments. */
export type RepoEnrichment = {
  enrichedAt: string
  enrichers: string[]
} & Record<string, unknown>
