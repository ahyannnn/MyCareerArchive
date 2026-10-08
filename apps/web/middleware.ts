import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Shallow guard: redirect when no session cookie is present. This is NOT the
// real authorization check — pages (and the API itself) validate the session
// against Postgres. It just avoids rendering protected pages for signed-out
// visitors and saves a round-trip.
export function middleware(request: NextRequest) {
  if (!request.cookies.has("better-auth.session_token")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/timeline/:path*",
    "/career/:path*",
    "/resume/:path*",
    "/portfolio/:path*",
    "/jobs/:path*",
    "/interviews/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/activity/:path*",
  ],
};
