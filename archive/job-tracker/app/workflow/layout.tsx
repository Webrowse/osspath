import { WorkspaceProviders } from "@/components/workspace-providers"

export default function WorkflowLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProviders>{children}</WorkspaceProviders>
}
