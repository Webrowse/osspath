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
            description="Searches the latest Ask HN: Who is hiring? thread for Rust-related comments via Algolia HN API. DeepSeek fills all job fields."
            source="hn-hiring"
          />
          <ScannerPanel
            id="github"
            title="GitHub OSS"
            description="Good-first-issues, help-wanted, star-range queries, and 12 org scans (tokio-rs, embassy-rs, bevyengine, etc.). All repos classified by DeepSeek."
            source="github-oss"
          />
          <ScannerPanel
            id="grants"
            title="Grants & Bounties"
            description="Searches HN for Rust Foundation grants, open source bounties, and ecosystem funding announcements. DeepSeek extracts kind, name, status, and URL."
            source="hn-grants"
          />
          <ScannerPanel
            id="pulse"
            title="Ecosystem Pulse"
            description="Searches GitHub for Rust community resources — newsletters, podcasts, blogs — via topic tags. DeepSeek classifies each as Newsletter, Forum, Podcast, etc."
            source="github-pulse"
          />
          <ScannerPanel
            id="events"
            title="Events & Conferences"
            description="Searches HN for Rust conference and workshop announcements (RustConf, EuroRust, Oxidize, etc.). DeepSeek extracts date, format, and registration URL."
            source="hn-events"
          />
          <ScannerPanel
            id="portals"
            title="Job Portals"
            description="Seeds direct Rust-filtered pages for major job boards (LinkedIn, Indeed, Glassdoor, We Work Remotely, Arc.dev, Hired) plus HN discussion mining. One-time seeding — re-running skips already-queued or published portals."
            source="portal-seed"
          />
          <ScannerPanel
            id="companies"
            title="Companies Using Rust"
            description="Finds GitHub organizations with multiple high-star Rust repos. Groups repos by owning org, fetches org details, and uses DeepSeek to classify sector and extract company website."
            source="github-orgs"
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
