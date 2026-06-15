import type { Metadata } from "next"
import { Geist, Geist_Mono, Newsreader, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://jobs.adarshrust.com"),
  title: {
    default: "Rust Atlas — Rust ecosystem graph",
    template: "%s | Rust Atlas",
  },
  description:
    "Curated Rust ecosystem opportunities — remote jobs, repos, funding, and ecosystem signals. Kept short and read by a human first.",
  keywords: ["rust jobs", "rust ecosystem", "open source rust", "rust grants", "remote rust engineering"],
  authors: [{ name: "Adarsh" }],
  openGraph: {
    title: "Rust Atlas — Rust ecosystem graph",
    description:
      "Remote jobs, repos, funding, and quiet ecosystem signals — kept short and read by a human first.",
    url: "/",
    siteName: "Rust Atlas",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rust Atlas",
    description: "Curated Rust ecosystem paths — jobs, repos, funding, and community signals.",
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
  try {
    var et = localStorage.getItem('e-theme');
    if (et) document.documentElement.setAttribute('data-e-theme', et);
  } catch(e) {}
})()
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${ibmPlexMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
