// Temporary memory-usage logging for the Railway memory investigation.
// Remove once the /oss static-conversion fix is confirmed to hold memory flat.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const m = process.memoryUsage()
  console.log(
    "[mem] server start",
    `rss=${(m.rss / 1048576).toFixed(1)}MB`,
    `heapUsed=${(m.heapUsed / 1048576).toFixed(1)}MB`,
  )

  // dynamicParams=false pages (jobs/[slug], ecosystem/[slug], oss/[owner]/[repo],
  // deps/[crate]) throw this internally for any param outside generateStaticParams
  // — stale links and bots probing slugs. Next.js already turns it into a correct
  // 404 response; this just stops it from spamming error-level logs with a stack
  // trace on every miss.
  const origError = console.error
  console.error = (...args: unknown[]) => {
    const isNoFallback = args.some(
      (a) => a instanceof Error && a.message === "Internal: NoFallbackError",
    )
    if (isNoFallback) return
    origError(...args)
  }
}
