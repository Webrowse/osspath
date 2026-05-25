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

  // Authenticated responses must not be cached publicly
  if (userId) {
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    })
  }

  // Unauthenticated: short public cache — safe because no user data
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  })
}
