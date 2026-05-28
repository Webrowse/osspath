import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { WorkspaceSidebar } from "@/components/workspace-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        background: "var(--bg-0)",
        overflow: "hidden",
      }}
    >
      <div className="shell-sidebar" style={{ display: "flex" }}>
        <Suspense>
          <WorkspaceSidebar />
        </Suspense>
      </div>
      <main
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",
          padding: "20px 24px 40px",
        }}
      >
        {children}
      </main>
    </div>
  )
}
