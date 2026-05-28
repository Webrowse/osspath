import { DeepSeekTester } from "@/components/admin/deepseek-tester"

export default function TestDeepSeekPage() {
  return (
    <>
      <div className="adm-page-header">
        <span className="adm-page-title">DeepSeek Diagnostic</span>
        <span className="adm-page-meta">Isolated API test — not a scanner</span>
      </div>
      <div className="adm-content">
        <DeepSeekTester />
      </div>
    </>
  )
}
