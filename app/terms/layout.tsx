import { WorkspaceProviders } from "@/components/workspace-providers"

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProviders>{children}</WorkspaceProviders>
}
