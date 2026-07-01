import type { SchemaStatus } from "@/lib/admin/schema-version"

function short(s: string | null, n = 12): string {
  return s ? s.slice(0, n) : "—"
}

function fmt(d: Date | null): string {
  return d ? `${new Date(d).toISOString().slice(0, 16).replace("T", " ")} UTC` : "—"
}

export function SchemaStatusPanel({ status }: { status: SchemaStatus }) {
  return (
    <div className={`adm-schema${status.match ? "" : " adm-schema--warn"}`}>
      {status.match ? (
        <div className="adm-schema__ok">✓ Database schema matches the application</div>
      ) : (
        <div className="adm-schema__alert">
          <strong>⚠ Database schema does not match the running application</strong>
          <span>
            The database may have been applied from a different or stale checkout. From an
            up-to-date checkout, run <code>npm run db:apply</code>.
          </span>
          {status.error && <span className="adm-schema__err">{status.error}</span>}
        </div>
      )}
      <div className="adm-schema__grid">
        <div><span>status</span><code>{status.match ? "match" : "MISMATCH"}</code></div>
        <div><span>app fingerprint</span><code>{short(status.appFingerprint)}</code></div>
        <div><span>db fingerprint</span><code>{short(status.dbFingerprint)}</code></div>
        <div><span>current commit</span><code>{short(status.currentCommit, 8)}</code></div>
        <div><span>db commit</span><code>{short(status.dbCommit, 8)}</code></div>
        <div><span>last updated</span><code>{fmt(status.updatedAt)}</code></div>
      </div>
    </div>
  )
}
