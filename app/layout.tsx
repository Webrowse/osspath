import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
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

export const metadata: Metadata = {
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
  },
  twitter: {
    card: "summary_large_image",
    title: "jobs.adarshrust.com",
    description: "Remote engineering job tracker for Rust and systems engineers.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
