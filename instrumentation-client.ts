import posthog from "posthog-js"

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
  capture_pageview: false,
  capture_pageleave: false,
  autocapture: false,
  persistence: "localStorage+cookie",
  capture_exceptions: true,
})
