export default function ScanLoading() {
  return (
    <>
      <div className="adm-page-header">
        <span className="adm-page-title">Scan Sources</span>
        <span className="adm-page-meta">Loading…</span>
      </div>
      <div className="adm-content">
        <div className="adm-scan-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="adm-scan-card" style={{ minHeight: 120 }}>
              <div className="adm-skeleton" style={{ height: 14, width: "60%", borderRadius: 4 }} />
              <div className="adm-skeleton" style={{ height: 11, width: "90%", borderRadius: 3, marginTop: 4 }} />
              <div className="adm-skeleton" style={{ height: 11, width: "75%", borderRadius: 3 }} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
