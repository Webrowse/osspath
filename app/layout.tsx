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
  metadataBase: new URL("https://osspath.com"),
  title: {
    default: "OSSPath — Navigate the Rust Ecosystem",
    template: "%s | OSSPath",
  },
  description:
    "Explore repositories, jobs, organizations, funding programs, and ecosystem relationships across the Rust ecosystem.",
  keywords: ["rust jobs", "rust ecosystem", "open source rust", "rust grants", "remote rust engineering"],
  authors: [{ name: "Adarsh" }],
  openGraph: {
    title: "OSSPath — Navigate the Rust Ecosystem",
    description:
      "Explore repositories, jobs, organizations, funding programs, and ecosystem relationships across the Rust ecosystem.",
    url: "/",
    siteName: "OSSPath",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OSSPath",
    description: "Navigate the Rust ecosystem as a connected graph — jobs, repos, funding, and community signals.",
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
