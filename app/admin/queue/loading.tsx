export default function QueueLoading() {
  return (
    <>
      <div className="adm-tabs">
        {["Jobs","Repos","Funding","Pulse","Events","Companies","Job Portals"].map((label) => (
          <span key={label} className="adm-tab adm-tab--skeleton">{label}</span>
        ))}
      </div>

      <div className="adm-page-header">
        <span className="adm-page-title">Loading…</span>
        <span className="adm-page-meta adm-skeleton" style={{ width: 60, height: 14, display: "inline-block" }} />
      </div>

      <div className="adm-content">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="adm-queue-skeleton" />
        ))}
      </div>
    </>
  )
}
