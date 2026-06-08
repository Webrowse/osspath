/** Single source of truth for editorial site navigation.
 *  Homepage uses anchor hrefs, archive pages use archive hrefs. */
export const SITE_NAV = [
  { label: "Jobs",      anchor: "#jobs",      archive: "/jobs" },
  { label: "OSS",       anchor: "#oss",       archive: "/oss" },
  { label: "Grants",    anchor: "#grants",    archive: "/grants" },
  { label: "Pulse",     anchor: "#pulse",     archive: "/pulse" },
  { label: "Events",    anchor: "#events",    archive: "/events" },
  { label: "Companies", anchor: "#companies", archive: "/ecosystem" },
  { label: "Portals",   anchor: "#portals",   archive: "/portals" },
] as const

export type NavEntry = (typeof SITE_NAV)[number]
