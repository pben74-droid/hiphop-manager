import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {

  const token = request.cookies.get("sb-access-token")

  if (!token && !request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/report/:path*",
    "/insegnanti/:path*",
    "/lezioni/:path*",
    "/compensi/:path*"
  ]
}
