import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCompanies } from "@/lib/companies"
import { parseFilters } from "@/types"

export async function GET(req: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id

  const params: Record<string, string | string[]> = {}
  req.nextUrl.searchParams.forEach((value, key) => {
    const existing = params[key]
    if (existing) {
      params[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
    } else {
      params[key] = value
    }
  })

  const filters = parseFilters(params)
  const result = await getCompanies(filters, userId)

  return NextResponse.json(result)
}
