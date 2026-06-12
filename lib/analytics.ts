// Analytics — PostHog wrapper
// Requires: NEXT_PUBLIC_POSTHOG_KEY in env (same key for client + server)
// Host defaults to US cloud; set NEXT_PUBLIC_POSTHOG_HOST for EU or self-hosted.
// All functions are no-ops when key is missing — safe to deploy without analytics.

import { PostHog } from "posthog-node"

// ─── Typed event catalogue ────────────────────────────────────────────────────
// Add events here; import this type wherever you track to keep names consistent.

export type AppEvent =
  | { event: "sign_in"; props: { provider: string; is_new_user: boolean } }

// ─── Server-side capture ──────────────────────────────────────────────────────
// Use in Server Actions and NextAuth callbacks.
// Creates a new PostHog client per call (safe for serverless — flushAt: 1).

export async function captureServerEvent(distinctId: string, ev: AppEvent): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || key.startsWith("phc_placeholder")) return

  const ph = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  })

  ph.capture({ distinctId, event: ev.event, properties: ev.props })
  await ph.flush()
}
