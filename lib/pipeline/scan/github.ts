import { inferEcoFromRepo, deriveTopicsFromRepo } from "@/lib/admin/deepseek"
import type { RepoInput } from "@/lib/admin/deepseek"

/**
 * Shared GitHub helpers used by every GitHub-backed scanner core (github-oss,
 * github-pulse, companies, rust-bytes, TWIR). Deterministic and pure aside from
 * ghFetch's network call — no DeepSeek. One implementation, no duplication.
 */

export const GH_HEADERS = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "osspath.com/scanner",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
}

export async function ghFetch(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: GH_HEADERS, signal: AbortSignal.timeout(20_000), next: { revalidate: 0 } })
  if (res.status === 403) throw new Error("GitHub rate-limited (403). Set GITHUB_TOKEN in .env.local.")
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${url}`)
  return res.json()
}

export async function ossSearchPage(query: string, page: number): Promise<any[]> {
  try {
    const data = await ghFetch(
      `https://api.github.com/search/repositories?q=${query}&sort=updated&per_page=100&page=${page}`,
    ) as { items?: unknown[] }
    return data?.items ?? []
  } catch {
    return []
  }
}

/** Deterministic quality filter — no AI. Returns junk:true for repos to drop. */
export function ossJunkFilter(r: RepoInput & { archived?: boolean; disabled?: boolean }): { junk: boolean; reason: string } {
  if (r.archived || r.disabled) return { junk: true, reason: "archived or disabled" }
  if ((r.stargazers_count ?? 0) < 20) return { junk: true, reason: "under 20 stars" }

  const nameLc = r.name.toLowerCase()
  const descLc = (r.description ?? "").toLowerCase()

  if (nameLc.startsWith("awesome-") || nameLc.startsWith("awesome_") || nameLc === "awesome") {
    return { junk: true, reason: "awesome-list" }
  }
  if (/^(list-of|curated|resources|links)-/.test(nameLc)) {
    return { junk: true, reason: "resource list" }
  }
  if (descLc.includes("curated list") || descLc.includes("a list of") ||
      descLc.includes("collection of resources") || descLc.includes("a collection of awesome")) {
    return { junk: true, reason: "curated list (description)" }
  }

  if (/-(tutorial|tutorials|guide|guides|course|courses|workshop|workshops|book|exercises|kata)s?$/.test(nameLc)) {
    return { junk: true, reason: "learning resource" }
  }
  if (/^(learn|learning|tutorial|guide|course|workshop|book|study)-/.test(nameLc)) {
    return { junk: true, reason: "learning resource" }
  }

  if (nameLc === "docs" || nameLc === "documentation" || nameLc.endsWith("-docs") || nameLc.endsWith(".github.io")) {
    return { junk: true, reason: "documentation repo" }
  }

  if (descLc.startsWith("mirror of") || descLc.startsWith("[mirror]") || descLc.includes("auto-mirror")) {
    return { junk: true, reason: "mirror repository" }
  }
  if (nameLc.endsWith("-mirror") || nameLc.startsWith("mirror-")) {
    return { junk: true, reason: "mirror repository" }
  }

  if (r.size === 0) return { junk: true, reason: "empty repository" }

  // Non-English repos — CJK/non-Latin scripts. u flag required for surrogate pairs.
  const NON_ENGLISH = /[぀-ヿ㐀-䶿一-鿿가-퟿豈-﫿Ѐ-ӿ؀-ۿ֐-׿ऀ-ॿ฀-๿]/u
  const stripParens = (s: string) => s.replace(/\s*\([^)]*\)/g, "")
  if (NON_ENGLISH.test(stripParens(r.name)) || NON_ENGLISH.test(stripParens(r.description ?? ""))) {
    return { junk: true, reason: "non-English script" }
  }

  return { junk: false, reason: "" }
}

/** Derive activityTier deterministically from pushed_at. */
export function ossActivityTier(pushedAt: string): "active" | "maintenance" | "dormant" {
  if (!pushedAt) return "dormant"
  const days = (Date.now() - new Date(pushedAt).getTime()) / 86_400_000
  if (days <= 30) return "active"
  if (days <= 90) return "maintenance"
  return "dormant"
}

/** Build the complete extracted OSS object from raw GitHub metadata — no AI. */
export function buildOSSExtracted(repo: RepoInput): Record<string, unknown> {
  const tier = ossActivityTier(repo.pushed_at)
  const eco = inferEcoFromRepo(repo.topics, repo.name, repo.description ?? "")
  return {
    name: repo.name,
    eco,
    href: repo.html_url,
    note: repo.description ?? "",
    topics: deriveTopicsFromRepo(repo),
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssuesCount: repo.open_issues_count,
    goodFirstIssuesCount: repo.good_first_issues_count ?? 0,
    helpWantedIssuesCount: repo.help_wanted_issues_count ?? 0,
    language: repo.language ?? null,
    owner: repo.owner_login ?? "",
    license: repo.license_spdx_id ?? null,
    pushedAt: repo.pushed_at,
    activityTier: tier,
    maintainerFriendliness: 0.5,
    issueQuality: 0.5,
    beginnerSuitability: 0.5,
    maintainerLabel: "",
    issueLabel: `${repo.open_issues_count} open issues`,
    beginnerLabel: "",
    ecosystem: [],
    beginnerFriendly: (repo.good_first_issues_count ?? 0) > 0,
    queue: true,
    skipReason: "",
  }
}

export function mapRepoResponse(r: any): RepoInput {
  return {
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    description: r.description ?? null,
    topics: r.topics ?? [],
    stargazers_count: r.stargazers_count ?? 0,
    pushed_at: r.pushed_at ?? "",
    size: r.size ?? 0,
    open_issues_count: r.open_issues_count ?? 0,
    good_first_issues_count: r.good_first_issues_count,
    help_wanted_issues_count: r.help_wanted_issues_count,
    forks_count: r.forks_count ?? 0,
    html_url: r.html_url ?? "",
    language: r.language ?? null,
    owner_login: r.owner?.login ?? "",
    license_spdx_id: r.license?.spdx_id ?? null,
  }
}

/** Extract unique github.com/{owner}/{repo} URLs from raw HTML. */
export function extractGitHubRepoUrls(html: string): string[] {
  const seen = new Set<string>()
  const re = /https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const [, owner, repo] = m
    if (repo === ".github" || owner === "topics" || owner === "trending") continue
    seen.add(`https://github.com/${owner}/${repo}`)
  }
  return [...seen]
}

// Rust orgs scanned directly (filtered by language=Rust during the scan).
export const RUST_ORGS = [
  "rust-lang", "rust-cli",
  "tokio-rs", "hyperium", "smol-rs", "quinn-rs", "libp2p",
  "embassy-rs", "oxidecomputer", "redox-os",
  "rustwasm", "bytecodealliance", "fermyon", "wasmerio",
  "tauri-apps", "slint-ui", "bevyengine", "linebender",
  "diesel-rs", "serde-rs", "rayon-rs",
  "PyO3",
  "pola-rs", "tracel-ai", "lance-format",
  "meilisearch", "qdrant", "paradedb", "databend-labs",
  "risingwavelabs", "quickwit-oss", "GreptimeTeam", "pgcentralfoundation",
  "vectordotdev", "rerun-io", "gitbutlerapp",
  "nushell", "zellij-org",
  "astral-sh", "prefix-dev",
  "jj-vcs",
  "denoland", "firecracker-microvm",
  "awslabs", "cloudflare", "microsoft", "google", "mozilla",
  "tikv", "pingcap", "apache",
  "cachix",
]
