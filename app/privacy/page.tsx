import type { Metadata } from "next"

export const metadata: Metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-4">
        <p>jobs.adarshrust.com is a personal project for tracking remote engineering job applications.</p>
        <p>We collect only your email, name, and profile image from your OAuth provider (GitHub or Google) for authentication purposes.</p>
        <p>Your application data (companies, statuses, notes) is private and only visible to you.</p>
        <p>We do not sell, share, or use your data for advertising.</p>
        <p>You can delete your account and all associated data at any time by contacting us.</p>
      </div>
    </div>
  )
}
