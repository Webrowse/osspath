import { config } from "dotenv"
config({ path: ".env.local" }); config()

/**
 * One-time migration: seed the curated Funders (previously a 100%
 * hand-authored content/funders.json with zero admin surface) into
 * ContentItem(type="funders"), so /admin/published?type=funders manages
 * the real data. Safe to delete this script once it has been run against
 * production and verified.
 *
 * Data embedded below is a point-in-time copy of content/funders.json.
 */

const SEED_FUNDERS = [
  {
    "slug": "rust-foundation",
    "name": "Rust Foundation",
    "kind": "foundation",
    "description": "Independent nonprofit supporting the Rust programming language, its community, and its ecosystem. Administers grants, fellowships, and hardship programs for contributors worldwide. The Rust Project (rust-lang) is a member project.",
    "href": "https://foundation.rust-lang.org",
    "company_slug": "rust-lang",
    "ecosystems": ["bevy","tauri","blockchain","embedded","ai","wasm","database","grpc","cli","axum","tokio"],
    "hq_country": "US",
    "checkedAt": "2026-06-11"
  },
  {
    "slug": "nlnet",
    "name": "NLnet Foundation",
    "kind": "foundation",
    "description": "Dutch public benefit foundation funding open internet infrastructure since 1997. Administers NGI Zero, NGI Assure, and NGI Commons on behalf of the European Commission. No nationality restrictions. Rust networking, cryptography, and protocol projects have a strong track record.",
    "href": "https://nlnet.nl",
    "ecosystems": ["wasm","embedded","database","grpc","cli"],
    "hq_country": "NL",
    "checkedAt": "2026-06-11"
  },
  {
    "slug": "openssf",
    "name": "OpenSSF",
    "kind": "foundation",
    "description": "Open Source Security Foundation, a Linux Foundation project. Funds security-critical work through Alpha-Omega and other initiatives. Rust's memory safety properties make Rust rewrites a recurring target for Alpha-Omega investments.",
    "href": "https://openssf.org",
    "ecosystems": ["embedded","wasm","cli","database","grpc"],
    "hq_country": "US",
    "checkedAt": "2026-06-11"
  },
  {
    "slug": "isrg",
    "name": "ISRG / Prossimo",
    "kind": "foundation",
    "description": "Internet Security Research Group, the nonprofit behind Let's Encrypt. Runs the Prossimo project — funding Rust rewrites of critical C/C++ internet infrastructure. Past awards include curl, Apache httpd mod_tls, the Linux kernel NVMe driver, and sudo-rs.",
    "href": "https://www.memorysafety.org",
    "ecosystems": ["embedded","wasm","cli"],
    "hq_country": "US",
    "checkedAt": "2026-06-11"
  },
  {
    "slug": "sovereign-tech-fund",
    "name": "Sovereign Tech Fund",
    "kind": "government",
    "description": "German federal government program (BMWK) investing in foundational open digital infrastructure. Larger than typical foundation grants — typically six-figure investments. Has funded the Rust toolchain, rustls, and cargo. STF typically initiates contact with projects rather than accepting open applications.",
    "href": "https://www.sovereigntechfund.de",
    "ecosystems": ["embedded","wasm","cli","database","grpc"],
    "hq_country": "DE",
    "checkedAt": "2026-06-11"
  },
  {
    "slug": "web3-foundation",
    "name": "Web3 Foundation",
    "kind": "foundation",
    "description": "Swiss foundation building the decentralized web. Runs the W3F Grants Program for projects building on Polkadot, Kusama, or Substrate. Rust is the primary implementation language for the SDK and most parachain runtimes.",
    "href": "https://web3.foundation",
    "ecosystems": ["blockchain","wasm"],
    "hq_country": "CH",
    "checkedAt": "2026-06-11"
  },
  {
    "slug": "polkadot-treasury",
    "name": "Polkadot Treasury",
    "kind": "protocol",
    "description": "On-chain treasury funded by Polkadot network fees and inflation. Governed by DOT holders through OpenGov. Any team can submit a spending proposal with public deliverables. Rust teams building Polkadot tooling, SDK maintenance, or parachain infrastructure are primary recipients.",
    "href": "https://polkadot.subsquare.io/treasury",
    "ecosystems": ["blockchain","wasm"],
    "chain": "polkadot",
    "checkedAt": "2026-06-11"
  },
  {
    "slug": "opensats",
    "name": "OpenSats",
    "kind": "foundation",
    "description": "US 501(c)(3) funding open source Bitcoin and broader FOSS infrastructure. Runs a Long-Term Support program providing sustained income for contributors. Rust Bitcoin tooling — BDK, LDK, rust-bitcoin — is eligible.",
    "href": "https://opensats.org",
    "ecosystems": ["blockchain","cli"],
    "hq_country": "US",
    "checkedAt": "2026-06-11"
  },
  {
    "slug": "otf",
    "name": "Open Technology Fund",
    "kind": "government",
    "description": "US government-funded nonprofit supporting open source internet freedom technologies globally. Funds security tools, censorship circumvention, and privacy infrastructure. Rust-based network and privacy libraries qualify.",
    "href": "https://www.opentech.fund",
    "ecosystems": ["cli","grpc","database"],
    "hq_country": "US",
    "checkedAt": "2026-06-11"
  },
  {
    "slug": "ostif",
    "name": "OSTIF",
    "kind": "foundation",
    "description": "Open Source Technology Improvement Fund. Manages and funds professional security audits for widely-used open source software. Covers audit costs and coordinates with expert security firms. Rust crates with broad downstream use are strong candidates.",
    "href": "https://ostif.org",
    "ecosystems": ["cli","database","grpc","wasm"],
    "hq_country": "US",
    "checkedAt": "2026-06-11"
  },
  {
    "slug": "algora",
    "name": "Algora",
    "kind": "platform",
    "description": "Open source bounty marketplace. Maintainers and companies fund specific GitHub issues; developers claim and solve them for payment. Supports fiat and crypto payouts with escrow. Active Rust category with bounties across async, database, and CLI crates.",
    "href": "https://algora.io",
    "checkedAt": "2026-06-11"
  },
  {
    "slug": "gitcoin",
    "name": "Gitcoin",
    "kind": "protocol",
    "description": "Ethereum-based public goods funding platform running quadratic funding rounds. Community donations are amplified by matching pools. Web3 and open source tooling rounds run quarterly. Rust blockchain projects can receive significant funding even from small donor bases.",
    "href": "https://gitcoin.co",
    "ecosystems": ["blockchain","wasm"],
    "chain": "ethereum",
    "checkedAt": "2026-06-11"
  },
  {
    "slug": "cloudflare",
    "name": "Cloudflare",
    "kind": "company",
    "description": "Global edge networking company. Sponsors the annual Workers Hackathon with prizes for projects built on Cloudflare Workers infrastructure. Rust compiles natively to WASM for Workers — a natural fit for high-performance edge compute.",
    "href": "https://cloudflare.com",
    "company_slug": "cloudflare",
    "ecosystems": ["wasm","cli"],
    "hq_country": "US",
    "checkedAt": "2026-06-11"
  },
]

async function main() {
  const { writeContent } = await import("@/lib/admin/storage")
  console.log(`Seeding ${SEED_FUNDERS.length} curated Funders into ContentItem(type="funders")...`)
  await writeContent("funders", SEED_FUNDERS)
  console.log("Done. Verify at /admin/published?type=funders and on the live /funders page after publish.")
  process.exit(0)
}

main().catch((e) => { console.error("FAILED", e); process.exit(1) })
