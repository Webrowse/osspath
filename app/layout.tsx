import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { SessionProvider } from "@/components/session-provider"
import { UIPreferencesProvider } from "@/lib/theme"
import { CommandPaletteMount } from "@/components/command-palette"
import { PostHogProvider } from "@/components/posthog-provider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://jobs.adarshrust.com"),
  title: {
    default: "jobs.adarshrust.com — Remote Engineering Job Tracker",
    template: "%s | jobs.adarshrust.com",
  },
  description:
    "Track all your remote job applications in one place. Rust, backend, systems, infra, distributed systems, and remote engineering companies.",
  keywords: ["rust jobs", "remote engineering", "job tracker", "backend jobs", "systems programming"],
  authors: [{ name: "Adarsh" }],
  openGraph: {
    title: "jobs.adarshrust.com — Remote Engineering Job Tracker",
    description:
      "Track all your remote job applications in one place. Rust, backend, systems, infra, distributed systems.",
    url: "https://jobs.adarshrust.com",
    siteName: "jobs.adarshrust.com",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "jobs.adarshrust.com",
    description: "Remote engineering job tracker for Rust and systems engineers.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
}

// Reads preferences before React hydrates — prevents flash of wrong theme
const preferencesScript = `
(function(){
  try {
    var t = localStorage.getItem('ui-theme') || 'graphite';
    var d = localStorage.getItem('ui-density') || 'comfortable';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.setAttribute('data-density', d);
    if (t !== 'light') document.documentElement.classList.add('dark');
  } catch(e) {}
})()
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SessionProvider>
          <PostHogProvider>
            <UIPreferencesProvider>
              {children}
              <CommandPaletteMount />
            </UIPreferencesProvider>
          </PostHogProvider>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  )
}
