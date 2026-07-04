/** Single source of truth for editorial site navigation.
 *  Homepage uses anchor hrefs, archive pages use archive hrefs. */
export const SITE_NAV = [
  { label: "Repos",      anchor: "#repos",         archive: "/oss" },
  { label: "Crates",     anchor: "#crates",        archive: "/deps" },
  { label: "Ecosystems", anchor: "#ecosystems",    archive: "/ecosystems" },
  { label: "Orgs",       anchor: "#organizations", archive: "/ecosystem" },
  { label: "Funding",    anchor: "#funding",       archive: "/grants" },
  { label: "Jobs",       anchor: "#jobs",          archive: "/jobs" },
] as const

/** Explore dropdown — curated ecosystem resources, not graph entities. */
export const EXPLORE_NAV = [
  { label: "News",       href: "/news",     description: "Releases, blog posts, and community links" },
  { label: "Authors",    href: "/authors",  description: "Writers and maintainers worth following" },
  { label: "Learning",   href: "/learning", description: "Curated resources to understand Rust" },
  { label: "Community",  href: "/pulse",    description: "Newsletters, forums, and podcasts" },
  { label: "Events",     href: "/events",   description: "Conferences and workshops" },
  { label: "Job Boards", href: "/portals",  description: "Rust job boards and aggregators" },
] as const

export const FOOTER_NAV = [
  { label: "News",      href: "/news" },
  { label: "Community", href: "/pulse" },
  { label: "Events",    href: "/events" },
  { label: "Job Boards", href: "/portals" },
  { label: "About",       href: "/about" },
  { label: "Methodology", href: "/methodology" },
  { label: "Contact",     href: "/contact" },
  { label: "Privacy",   href: "/privacy" },
] as const

export type NavEntry = (typeof SITE_NAV)[number]
export type ExploreEntry = (typeof EXPLORE_NAV)[number]
