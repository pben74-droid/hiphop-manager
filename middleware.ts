import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {

  const token =
    request.cookies.get("sb-access-token") ||
    request.cookies.get("sb-refresh-token")

  const path = request.nextUrl.pathname

  // lascia libera solo la pagina login
  if (!token && path !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|api).*)"
  ]
}
