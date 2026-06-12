"use client"

import { SessionProvider } from "@/components/session-provider"
import { UIPreferencesProvider } from "@/lib/theme"
import { CommandPaletteMount } from "@/components/command-palette"
import { PostHogProvider } from "@/components/posthog-provider"

export function WorkspaceProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PostHogProvider>
        <UIPreferencesProvider>
          {children}
          <CommandPaletteMount />
        </UIPreferencesProvider>
      </PostHogProvider>
    </SessionProvider>
  )
}
