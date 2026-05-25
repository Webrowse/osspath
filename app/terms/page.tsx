import type { Metadata } from "next"

export const metadata: Metadata = { title: "Terms of Service" }

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
      <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-4">
        <p>By using jobs.adarshrust.com, you agree to use it for personal job tracking purposes only.</p>
        <p>This is a free tool provided as-is, without warranty of any kind.</p>
        <p>Do not use this service to scrape, spam, or abuse any third-party systems.</p>
        <p>We reserve the right to terminate accounts that violate these terms.</p>
      </div>
    </div>
  )
}
