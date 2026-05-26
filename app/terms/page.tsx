import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for jobs.adarshrust.com — a free personal tool for tracking remote engineering job applications.",
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-4">
          <p>By using jobs.adarshrust.com, you agree to use it for personal job tracking purposes only.</p>
          <p>This is a free tool provided as-is, without warranty of any kind.</p>
          <p>Do not use this service to scrape, spam, or abuse any third-party systems.</p>
          <p>We reserve the right to terminate accounts that violate these terms.</p>
        </div>
      </main>
    </>
  )
}
