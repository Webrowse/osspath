/** Single source of truth for editorial site navigation.
 *  Homepage uses anchor hrefs, archive pages use archive hrefs. */
export const SITE_NAV = [
  { label: "Jobs",       anchor: "#jobs",          archive: "/jobs" },
  { label: "Repos",      anchor: "#repos",         archive: "/oss" },
  { label: "Funding",    anchor: "#funding",       archive: "/grants" },
  { label: "Ecosystems", anchor: "#ecosystems",    archive: "/ecosystems" },
  { label: "Orgs",       anchor: "#organizations", archive: "/ecosystem" },
] as const

export const FOOTER_NAV = [
  { label: "Community", href: "/pulse" },
  { label: "Events",    href: "/events" },
  { label: "Job Boards", href: "/portals" },
  { label: "Contact",   href: "/contact" },
  { label: "Privacy",   href: "/privacy" },
] as const

export type NavEntry = (typeof SITE_NAV)[number]
