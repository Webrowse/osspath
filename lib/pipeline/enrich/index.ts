import type { Enricher, EnrichInput, RepoEnrichment } from "./types"
import { cargoEnricher } from "./cargo-enricher"
import { readRepoFile, listRepoDir, parseRepoRef, type RepoRef } from "./github-files"

export { parseRepoRef }
export type { RepoRef, RepoEnrichment }
export type { CargoEnrichment } from "./cargo-enricher"

/**
 * Enrichment schema version. Bump whenever the enricher set or output shape
 * changes so the backfill re-enriches the whole corpus to the new version and
 * the dataset never stays permanently heterogeneous.
 */
export const ENRICHMENT_VERSION = 1

/**
 * Tier 1 enricher chain, in order. Additional per-repo enrichers (ecosystem,
 * technologies, contribution readiness, ...) append here later; each sees
 * earlier results via `acc`, so new intrinsic capabilities plug in without a
 * pipeline rewrite. Cross-repo relationships belong to Tier 2, not here.
 */
export const DEFAULT_ENRICHERS: Enricher[] = [cargoEnricher]

export type EnrichOutcome =
  | { ok: true; enrichment: RepoEnrichment; notes: string[] }
  | { ok: false; error: string; enricher: string }

/**
 * Run the enricher chain over one repo. Fail-closed: if a required enricher
 * fails, the whole enrichment fails and the caller must hold the repo back.
 * Optional enrichers only contribute a note when they fail.
 */
export async function runEnrichment(input: EnrichInput, enrichers: Enricher[] = DEFAULT_ENRICHERS): Promise<EnrichOutcome> {
  const acc: Record<string, unknown> = {}
  const ran: string[] = []
  const notes: string[] = []

  for (const enricher of enrichers) {
    let result
    try {
      result = await enricher.run(input, acc)
    } catch (err) {
      result = { ok: false as const, error: (err as Error)?.message ?? String(err) }
    }
    if (!result.ok) {
      if (enricher.required) return { ok: false, error: result.error, enricher: enricher.name }
      notes.push(`${enricher.name}: skipped (${result.error})`)
      continue
    }
    Object.assign(acc, result.data)
    ran.push(enricher.name)
    if (result.notes) notes.push(...result.notes.map((n) => `${enricher.name}: ${n}`))
  }

  const sourcePushedAt = typeof input.base.pushedAt === "string" ? input.base.pushedAt : null
  return {
    ok: true,
    enrichment: { version: ENRICHMENT_VERSION, sourcePushedAt, enrichedAt: new Date().toISOString(), enrichers: ran, ...acc },
    notes,
  }
}

/** Build an EnrichInput backed by the live GitHub readers for a repo. */
export function enrichInputForRepo(ref: RepoRef, base: Readonly<Record<string, unknown>>): EnrichInput {
  return {
    ref,
    base,
    readFile: (path) => readRepoFile(ref, path),
    listDir: (path) => listRepoDir(ref, path),
  }
}
