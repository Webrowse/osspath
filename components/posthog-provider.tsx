"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect } from "react"

// Track client-side navigation in App Router (pathname changes = SPA nav)
function PageViewTracker() {
  const pathname = usePathname()
  const ph = usePostHog()

  useEffect(() => {
    if (!ph) return
    // Intentionally omit search params to avoid leaking filter state to analytics
    ph.capture("$pageview", { $current_url: window.origin + pathname })
  }, [pathname, ph])

  return null
}

// Identify logged-in users so events are associated with an account
function UserIdentifier() {
  const { data: session } = useSession()
  const ph = usePostHog()

  useEffect(() => {
    if (!ph || !session?.user?.id) return
    ph.identify(session.user.id, {
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
    })
  }, [session?.user?.id, ph])

  return null
}

// PostHog is initialized via instrumentation-client.ts (Next.js 15.3+).
// This provider only supplies the React context for usePostHog() hooks.
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PageViewTracker />
      <UserIdentifier />
      {children}
    </PHProvider>
  )
}
