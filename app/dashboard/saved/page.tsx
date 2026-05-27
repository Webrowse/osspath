import { redirect } from "next/navigation"

export default function SavedPage() {
  redirect("/companies?status=SAVED")
}
