import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for jobs.adarshrust.com — what data we collect, how it's used, and how to delete your account.",
}

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-4">
          <p>jobs.adarshrust.com is a personal project for tracking remote engineering job applications.</p>
          <p>We collect only your email, name, and profile image from your OAuth provider (GitHub or Google) for authentication purposes.</p>
          <p>Your application data (companies, statuses, notes) is private and only visible to you.</p>
          <p>We do not sell, share, or use your data for advertising.</p>
          <p>
            You can delete your account and all associated data at any time by contacting{" "}
            <a href="mailto:great.adarsh@gmail.com" className="text-foreground hover:underline">
              great.adarsh@gmail.com
            </a>
            .
          </p>
        </div>
      </main>
    </>
  )
}
