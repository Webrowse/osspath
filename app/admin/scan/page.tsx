import { ScannerPanel } from "@/components/admin/scanner-panel"
import { ManualAddForm } from "@/components/admin/manual-add-form"

export default function ScanPage() {
  return (
    <>
      <div className="adm-page-header">
        <span className="adm-page-title">Scan Sources</span>
        <span className="adm-page-meta">Results go to pending queue — never auto-published</span>
      </div>

      <div className="adm-content">
        <div className="adm-scan-grid">
          <ScannerPanel
            id="hn"
            title="HN Who Is Hiring"
            description="Searches the latest Ask HN: Who is hiring? thread for Rust-related comments via Algolia HN API (no key needed)."
            source="hn-hiring"
          />
          <ScannerPanel
            id="twir"
            title="This Week in Rust — Jobs"
            description="Fetches the latest TWIR issue and extracts the Jobs section."
            source="twir"
          />
          <ScannerPanel
            id="github"
            title="GitHub OSS — good-first-issue"
            description="Recently updated Rust repos with good-first-issue labels. GitHub public API, rate limited without token."
            source="github-oss"
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="adm-manual">
            <div className="adm-manual__title">Manual Add</div>
            <ManualAddForm />
          </div>
        </div>
      </div>
    </>
  )
}
