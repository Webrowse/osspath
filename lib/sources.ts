// All source data is static — no DB, no scraping.
// Update this file manually when sources change.

export type SignalQuality = "high" | "medium" | "low"
export type NoiseLevel = "low" | "medium" | "high"
export type UpdateCadence = "daily" | "weekly" | "monthly" | "irregular"
export type SourceType = "curated" | "community" | "aggregator"
export type RemoteSupport = "remote-only" | "remote-friendly" | "mixed"

export interface Source {
  id: string
  name: string
  url: string
  description: string
  category: SourceCategory
  signalQuality: SignalQuality
  noiseLevel: NoiseLevel
  beginnerFriendly: boolean
  remote: RemoteSupport
  cadence: UpdateCadence
  type: SourceType
  tip?: string
}

export type SourceCategory =
  | "rust_boards"
  | "community"
  | "remote"
  | "web3"
  | "oss_infra"
  | "general"

export const CATEGORY_META: Record<
  SourceCategory,
  { label: string; description: string }
> = {
  rust_boards: {
    label: "Direct Rust Boards",
    description: "Job boards built specifically for Rust engineering roles.",
  },
  community: {
    label: "Community & Newsletters",
    description: "Where the Rust community shares opportunities organically.",
  },
  remote: {
    label: "Remote-Focused",
    description: "Remote-first engineering boards with consistent Rust presence.",
  },
  web3: {
    label: "Web3 & Crypto",
    description:
      "Blockchain and crypto infrastructure hiring — heavily Rust-based (Solana, Polkadot, Near).",
  },
  oss_infra: {
    label: "OSS & Infrastructure",
    description: "Cloud-native and open source project hiring with systems engineering roles.",
  },
  general: {
    label: "General Engineering",
    description: "High-volume boards worth filtering — use search + recency to cut noise.",
  },
}

export const SOURCES: Source[] = [
  // ─── Direct Rust Boards ──────────────────────────────────────────────────────
  {
    id: "rustjobs-dev",
    name: "RustJobs.dev",
    url: "https://rustjobs.dev",
    description:
      "The primary dedicated Rust job board. Most listings require Rust as the primary language — low noise, high signal.",
    category: "rust_boards",
    signalQuality: "high",
    noiseLevel: "low",
    beginnerFriendly: false,
    remote: "remote-friendly",
    cadence: "weekly",
    type: "aggregator",
    tip: "Sort by newest. Skip listings that mention Rust as one of six languages.",
  },
  {
    id: "filtra",
    name: "Filtra",
    url: "https://filtra.io/rust",
    description:
      "Manually curated Rust job digest. Listings are filtered by humans — you won't find fluff here.",
    category: "rust_boards",
    signalQuality: "high",
    noiseLevel: "low",
    beginnerFriendly: false,
    remote: "remote-friendly",
    cadence: "weekly",
    type: "curated",
    tip: "Subscribe to the digest for weekly delivery to your inbox.",
  },
  {
    id: "rust-careers",
    name: "Rust.Careers",
    url: "https://rust.careers",
    description:
      "Community-driven Rust job listings. Smaller volume than RustJobs.dev, but independently maintained.",
    category: "rust_boards",
    signalQuality: "medium",
    noiseLevel: "low",
    beginnerFriendly: false,
    remote: "remote-friendly",
    cadence: "irregular",
    type: "community",
  },

  // ─── Community & Newsletters ─────────────────────────────────────────────────
  {
    id: "rust-users-forum",
    name: "Rust Users Forum — Jobs",
    url: "https://users.rust-lang.org/c/jobs/14",
    description:
      "The official Rust community forum's job category. Companies posting here are engaged with the Rust ecosystem — not just HR teams spraying job boards. Good mix of junior and senior roles, often at companies that care about correctness over hype.",
    category: "community",
    signalQuality: "high",
    noiseLevel: "low",
    beginnerFriendly: true,
    remote: "remote-friendly",
    cadence: "weekly",
    type: "community",
    tip: "Sort by 'latest'. Companies posting here tend to value community fit — mention the forum in your outreach. Good starting point for first Rust job applications.",
  },
  {
    id: "hn-hiring",
    name: "HN: Who is Hiring?",
    url: "https://news.ycombinator.com/submitted?id=whoishiring",
    description:
      "Monthly hiring thread on Hacker News. Best signal for funded startups and early-stage companies. Rust roles appear frequently.",
    category: "community",
    signalQuality: "high",
    noiseLevel: "medium",
    beginnerFriendly: true,
    remote: "remote-friendly",
    cadence: "monthly",
    type: "community",
    tip: "Ctrl+F 'Rust' in the current month's thread. Look for REMOTE at the start of posts. Posts that mention 'learning' or 'team player' alongside Rust are more beginner-accessible than those requiring 5+ years.",
  },
  {
    id: "this-week-in-rust",
    name: "This Week in Rust",
    url: "https://this-week-in-rust.org",
    description:
      "Weekly Rust ecosystem newsletter. The 'Jobs' section curates openings from companies actively contributing to the ecosystem.",
    category: "community",
    signalQuality: "high",
    noiseLevel: "low",
    beginnerFriendly: true,
    remote: "remote-friendly",
    cadence: "weekly",
    type: "curated",
    tip: "Check the 'Jobs' section at the bottom of each issue. Companies listed here take Rust seriously — these are ecosystem contributors, not trend-chasers. Best starting point for any Rust job search.",
  },
  {
    id: "reddit-rust",
    name: "r/rust",
    url: "https://www.reddit.com/r/rust/search/?q=hiring&sort=new",
    description:
      "Rust subreddit. Companies occasionally post openings directly to the community — tends to attract mission-driven Rust engineers.",
    category: "community",
    signalQuality: "medium",
    noiseLevel: "medium",
    beginnerFriendly: true,
    remote: "remote-friendly",
    cadence: "irregular",
    type: "community",
    tip: "Search 'hiring' sorted by new. Also watch for '[JOB]' tagged posts in the main feed.",
  },

  // ─── Remote-Focused ──────────────────────────────────────────────────────────
  {
    id: "remoteok",
    name: "Remote OK",
    url: "https://remoteok.com/remote-rust-jobs",
    description:
      "Large remote job board with a dedicated Rust filter. Volume is high — apply recency and seniority filters to reduce noise.",
    category: "remote",
    signalQuality: "medium",
    noiseLevel: "high",
    beginnerFriendly: false,
    remote: "remote-only",
    cadence: "daily",
    type: "aggregator",
    tip: "Use the '/remote-rust-jobs' path for a pre-filtered view. Sort by date.",
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    url: "https://weworkremotely.com/remote-jobs/search?term=rust",
    description:
      "One of the largest remote engineering job boards. Rust roles surface occasionally — best for mid-to-senior levels.",
    category: "remote",
    signalQuality: "medium",
    noiseLevel: "high",
    beginnerFriendly: false,
    remote: "remote-only",
    cadence: "daily",
    type: "aggregator",
  },
  {
    id: "remote-rocket",
    name: "Remote Rocket",
    url: "https://remoterocket.io",
    description:
      "Remote-first engineering job board focused on quality over volume. Emerging source worth checking weekly.",
    category: "remote",
    signalQuality: "medium",
    noiseLevel: "medium",
    beginnerFriendly: false,
    remote: "remote-only",
    cadence: "weekly",
    type: "aggregator",
  },

  // ─── Web3 & Crypto ────────────────────────────────────────────────────────────
  {
    id: "cryptojobslist",
    name: "CryptoJobsList",
    url: "https://cryptojobslist.com/rust",
    description:
      "Crypto and Web3 engineering jobs with a Rust-specific filter. Solana, Polkadot, Near, and other Rust-native chains post here.",
    category: "web3",
    signalQuality: "medium",
    noiseLevel: "medium",
    beginnerFriendly: false,
    remote: "remote-friendly",
    cadence: "daily",
    type: "aggregator",
    tip: "The '/rust' path pre-filters for you. Focus on protocol and infrastructure roles.",
  },
  {
    id: "web3-career",
    name: "Web3.career",
    url: "https://web3.career/rust-jobs",
    description:
      "Web3 engineering job board. Heavy Rust usage across Polkadot, Solana, and Near ecosystems — senior-skewed.",
    category: "web3",
    signalQuality: "medium",
    noiseLevel: "medium",
    beginnerFriendly: false,
    remote: "remote-friendly",
    cadence: "daily",
    type: "aggregator",
  },

  // ─── OSS & Infrastructure ─────────────────────────────────────────────────────
  {
    id: "cncf-jobs",
    name: "CNCF Job Board",
    url: "https://jobs.cncf.io",
    description:
      "Cloud Native Computing Foundation job board. Strong overlap with Rust usage in containers, storage, networking, and observability tooling.",
    category: "oss_infra",
    signalQuality: "high",
    noiseLevel: "low",
    beginnerFriendly: false,
    remote: "remote-friendly",
    cadence: "weekly",
    type: "community",
    tip: "Filter by 'Engineering'. Companies like Cloudflare, Datadog, and Oxide post here.",
  },
  {
    id: "lf-jobs",
    name: "Linux Foundation Jobs",
    url: "https://jobs.linuxfoundation.org",
    description:
      "Open source infrastructure roles across LF member organizations. High Rust adoption in kernel, embedded, and systems projects.",
    category: "oss_infra",
    signalQuality: "high",
    noiseLevel: "low",
    beginnerFriendly: false,
    remote: "mixed",
    cadence: "irregular",
    type: "community",
  },

  // ─── General Engineering ─────────────────────────────────────────────────────
  {
    id: "wellfound",
    name: "Wellfound",
    url: "https://wellfound.com/role/r/software-engineer?keywords=rust",
    description:
      "Startup-focused engineering job board (formerly AngelList). Good for finding early-stage companies building with Rust.",
    category: "general",
    signalQuality: "medium",
    noiseLevel: "medium",
    beginnerFriendly: true,
    remote: "remote-friendly",
    cadence: "daily",
    type: "aggregator",
    tip: "Search 'Rust' and filter by 'Remote'. Early-stage startups here often have flexible experience requirements — a 0-2 year Rust role at a seed-stage company is realistic. Skip anything that lists Rust seventh in a 10-language stack.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    url: "https://www.linkedin.com/jobs/search/?keywords=rust+engineer&f_WT=2",
    description:
      "Highest volume, highest noise. Worth checking weekly with exact search terms and 'Past week' date filter to catch new postings.",
    category: "general",
    signalQuality: "low",
    noiseLevel: "high",
    beginnerFriendly: false,
    remote: "remote-friendly",
    cadence: "daily",
    type: "aggregator",
    tip: "Search 'Rust engineer' with the 'Remote' and 'Past week' filters. Ignore roles where Rust is listed last in a 10-language stack.",
  },
  {
    id: "greenhouse-search",
    name: "Greenhouse (direct search)",
    url: "https://boards.greenhouse.io",
    description:
      "Most VC-backed companies use Greenhouse ATS. Search individual company boards directly for 'Rust' to skip noisy aggregators.",
    category: "general",
    signalQuality: "high",
    noiseLevel: "low",
    beginnerFriendly: false,
    remote: "mixed",
    cadence: "daily",
    type: "aggregator",
    tip: "Go to greenhouse.io/boards/{company-slug} for companies you know use Rust. Bypass the noisy search.",
  },
]

export const CATEGORY_ORDER: SourceCategory[] = [
  "rust_boards",
  "community",
  "remote",
  "web3",
  "oss_infra",
  "general",
]

export function getSourcesByCategory(): Map<SourceCategory, Source[]> {
  const map = new Map<SourceCategory, Source[]>()
  for (const cat of CATEGORY_ORDER) {
    map.set(
      cat,
      SOURCES.filter((s) => s.category === cat)
    )
  }
  return map
}
