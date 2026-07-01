/**
 * Trigger a static-site rebuild after the pipeline changes published content.
 *
 * The public site is static and is rebuilt from PostgreSQL at deploy time. When
 * a run is dirty (something published or removed), we POST to a Railway deploy
 * hook so the site regenerates. When nothing changed, no rebuild fires, so cost
 * scales with daily changes rather than dataset size. Best-effort: a hook
 * failure is reported but never fails the run.
 */
export async function triggerRebuild(): Promise<{ triggered: boolean; note: string }> {
  const url = process.env.RAILWAY_DEPLOY_HOOK_URL
  if (!url) {
    return { triggered: false, note: "rebuild skipped: RAILWAY_DEPLOY_HOOK_URL not set" }
  }
  try {
    const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return { triggered: false, note: `rebuild hook returned HTTP ${res.status}` }
    return { triggered: true, note: "rebuild triggered" }
  } catch (e) {
    return { triggered: false, note: `rebuild hook failed: ${String(e)}` }
  }
}
