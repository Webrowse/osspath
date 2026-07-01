/**
 * Shared HN Algolia story search, used by the events and portals scanner cores.
 * Pure network helper — no auth, no persistence, no AI.
 */

export type HNStoryHit = {
  objectID: string
  title?: string
  url?: string
  created_at?: string
}

export async function hnSearch(query: string, hitsPerPage = 10): Promise<HNStoryHit[]> {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${hitsPerPage}`,
      { signal: AbortSignal.timeout(15_000), next: { revalidate: 0 } },
    )
    const data = await res.json() as { hits?: HNStoryHit[] }
    return data?.hits ?? []
  } catch {
    return []
  }
}
