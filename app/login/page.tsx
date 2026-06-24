import { redirect } from "next/navigation"
import { getSession, signIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to osspath.com to track your job applications.",
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function safeCallback(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw
  // Only allow relative paths — never redirect to external URLs
  if (v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\")) return v
  return "/"
}

export default async function LoginPage({ searchParams }: PageProps) {
  const [session, params] = await Promise.all([getSession(), searchParams])
  if (session) redirect(safeCallback(params.callbackUrl))

  const callbackUrl = safeCallback(params.callbackUrl)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Minimal header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px",
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: "linear-gradient(135deg, var(--d-rust) 0%, var(--d-accent) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              letterSpacing: "-0.5px",
              flexShrink: 0,
            }}
          >
            j.
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-2)",
            }}
          >
            osspath
          </span>
        </Link>
        <Link
          href="/"
          style={{
            fontSize: 13,
            color: "var(--fg-3)",
            textDecoration: "none",
          }}
        >
          ← Back to site
        </Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Track your Rust engineering job applications
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <form
              action={async (formData: FormData) => {
                "use server"
                const cb = (formData.get("callbackUrl") as string) || "/dashboard"
                await signIn("github", { redirectTo: cb })
              }}
            >
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <Button type="submit" className="w-full h-10 bg-secondary hover:bg-muted text-foreground border border-border" variant="secondary">
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Continue with GitHub
              </Button>
            </form>

          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By signing in, you agree to our{" "}
            <a href="/terms" className="hover:text-foreground">Terms</a> and{" "}
            <a href="/privacy" className="hover:text-foreground">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
