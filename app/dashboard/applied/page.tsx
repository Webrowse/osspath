import { redirect } from "next/navigation"

export default function AppliedPage() {
  redirect("/companies?status=APPLIED&status=OA&status=RECRUITER_CALL&status=INTERVIEWING&status=FINAL_ROUND&status=OFFER")
}
