import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { Navbar } from "@/components/navbar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <>
      <Navbar />
      <div className="flex-1 mx-auto max-w-3xl w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </>
  )
}
