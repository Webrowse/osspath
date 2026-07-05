/** Single source of truth for site navigation.
 *
 *  Two halves of the product:
 *  - DIRECTED (primary nav): Paths → Repos → Skills → Jobs. "Guide me."
 *  - EXPLORATORY (Explore menu): the Rust ecosystem library. "Show me the Rust world."
 *
 *  Labels describe user intent; URLs are preserved for SEO even where the
 *  visible name has evolved (e.g. /ecosystem shows Organizations).
 */

export const SITE_NAV = [
  { label: "Paths",      anchor: "#destinations",  archive: "/paths" },      // where do I want to go?
  { label: "Repos",      anchor: "#repos",         archive: "/oss" },        // what can I study / contribute to?
  { label: "Crates",     anchor: "#crates",        archive: "/deps" },       // what technologies matter?
  { label: "Ecosystems", anchor: "#ecosystems",    archive: "/ecosystems" }, // what areas exist?
  { label: "Orgs",       anchor: "#organizations", archive: "/ecosystem" },  // who builds Rust?
  { label: "Jobs",       anchor: "#jobs",          archive: "/jobs" },       // where can this lead?
] as const

/** Explore — the ecosystem library, grouped by discovery intent. */
export type ExploreItem  = { label: string; href: string; description: string }
export type ExploreGroup = { label: string; items: readonly ExploreItem[] }

export const EXPLORE_GROUPS: readonly ExploreGroup[] = [
  {
    label: "Stay updated",
    items: [
      { label: "Rust Pulse", href: "/news",  description: "What's happening in Rust right now" },
      { label: "Community",  href: "/pulse", description: "Newsletters, forums, and podcasts worth following" },
    ],
  },
  {
    label: "Learn deeply",
    items: [
      { label: "Learning", href: "/learning", description: "Curated resources to go deep" },
      { label: "People",   href: "/authors",  description: "Maintainers and writers worth following" },
    ],
  },
  {
    label: "Opportunities",
    items: [
      { label: "Funding",    href: "/grants",  description: "Grants and programs that pay for Rust work" },
      { label: "Job boards", href: "/portals", description: "Other places Rust roles are posted" },
    ],
  },
  {
    label: "Out in the world",
    items: [
      { label: "Events", href: "/events", description: "Conferences, meetups, and workshops" },
    ],
  },
]

/** Flat view of the Explore library — mobile menu and anywhere a list is needed. */
export const EXPLORE_NAV: readonly ExploreItem[] = EXPLORE_GROUPS.flatMap(g => [...g.items])

/** Footer — the product as it is today. */
export const FOOTER_TAGLINE =
  "Navigate the Rust ecosystem through real open-source evidence."

export const FOOTER_GROUPS = [
  {
    label: "Product",
    items: [
      { label: "Career Paths",  href: "/paths" },
      { label: "Repositories",  href: "/oss" },
      { label: "Crates",        href: "/deps" },
      { label: "Ecosystems",    href: "/ecosystems" },
      { label: "Organizations", href: "/ecosystem" },
      { label: "Jobs",          href: "/jobs" },
    ],
  },
  {
    label: "Ecosystem",
    items: [
      { label: "Explore",    href: "/explore" },
      { label: "Rust Pulse", href: "/news" },
      { label: "People",     href: "/authors" },
      { label: "Learning",   href: "/learning" },
      { label: "Funding",    href: "/grants" },
      { label: "Events",     href: "/events" },
    ],
  },
  {
    label: "Company",
    items: [
      { label: "About",       href: "/about" },
      { label: "Methodology", href: "/methodology" },
      { label: "Changelog",   href: "/changelog" },
      { label: "Contact",     href: "/contact" },
      { label: "Privacy",     href: "/privacy" },
      { label: "Terms",       href: "/terms" },
    ],
  },
] as const

export type NavEntry = (typeof SITE_NAV)[number]
export type ExploreEntry = ExploreItem
