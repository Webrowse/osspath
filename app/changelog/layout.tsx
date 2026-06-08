import { WorkspaceProviders } from "@/components/workspace-providers"

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProviders>{children}</WorkspaceProviders>
}
