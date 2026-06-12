import { Suspense } from "react"
import { WorkspaceSidebar } from "@/components/workspace-sidebar"
import { WorkspaceProviders } from "@/components/workspace-providers"

export default function SourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProviders>
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
    </WorkspaceProviders>
  )
}
