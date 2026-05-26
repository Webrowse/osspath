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

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key || key.startsWith("phc_placeholder")) return

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: false,   // manual via PageViewTracker
      capture_pageleave: false,
      autocapture: false,        // too noisy; explicit events only
      persistence: "localStorage+cookie",
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <PageViewTracker />
      <UserIdentifier />
      {children}
    </PHProvider>
  )
}
