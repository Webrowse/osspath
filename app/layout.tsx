import type { Metadata } from "next"
import { Geist, Geist_Mono, Newsreader, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"
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

// The body workhorse — previously referenced in CSS but never loaded, so all
// body text silently fell back to system-ui.
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://osspath.com"),
  title: {
    default: "OSSPath — Find Your Path to a Rust Engineering Job",
    template: "%s | OSSPath",
  },
  description:
    "Evidence-based career routes for Rust engineers: skills that matter, real repositories that prove them, and companies that hire — computed from thousands of production Rust codebases.",
  keywords: ["rust jobs", "rust career path", "rust ecosystem", "open source rust", "rust grants", "remote rust engineering", "become a rust developer"],
  authors: [{ name: "Adarsh" }],
  openGraph: {
    title: "OSSPath — Find Your Path to a Rust Engineering Job",
    description:
      "Evidence-based career routes for Rust engineers: the skills that matter, real repositories that prove them, and the companies that hire — computed from thousands of production Rust codebases.",
    url: "/",
    siteName: "OSSPath",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OSSPath",
    description: "See what real Rust projects actually use — crate adoption, companions, and health from thousands of indexed codebases.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/icon-dark.svg",  type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/icon-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/favicon.ico",    sizes: "any" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180" },
  },
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
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${ibmPlexMono.variable} ${ibmPlexSans.variable} h-full`}
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
