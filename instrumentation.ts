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
}
