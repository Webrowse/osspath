import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const host = request.headers.get("host") ?? ""
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("::1")
    if (!isLocal) {
      return new NextResponse(null, { status: 404 })
    }
  }
}

export const config = {
  matcher: ["/admin/:path*"],
}
