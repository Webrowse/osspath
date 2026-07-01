import { getActiveRun, getLatestRun } from "@/lib/admin/pipeline-runs"
import { getSchemaStatus } from "@/lib/admin/schema-version"
import { RefreshPanel } from "@/components/admin/refresh-panel"
import { SchemaStatusPanel } from "@/components/admin/schema-status"

export default async function AdminPage() {
  let active = null
  let latest = null
  try {
    ;[active, latest] = await Promise.all([getActiveRun(), getLatestRun()])
  } catch {
    // DB unreachable — panel still renders and Refresh will surface the error.
  }

  const schema = await getSchemaStatus()

  return (
    <>
      <div className="adm-page-header">
        <span className="adm-page-title">Pipeline</span>
        <span className="adm-page-meta">Scan, verify, review, and publish in one run</span>
      </div>
      <div className="adm-content" style={{ paddingBottom: 0 }}>
        <SchemaStatusPanel status={schema} />
      </div>
      <RefreshPanel initialActive={active} initialLatest={latest} />
    </>
  )
}
