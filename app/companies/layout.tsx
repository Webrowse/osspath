import { WorkspaceProviders } from "@/components/workspace-providers"

export default function CompaniesLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProviders>{children}</WorkspaceProviders>
}
