import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // Paths requiring authentication
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/incidents") ||
    pathname.startsWith("/hosts") ||
    pathname.startsWith("/models") ||
    pathname.startsWith("/runbooks") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/settings");

  // Auth pages (login/register)
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  if (!token && isProtectedRoute) {
    // Redirect unauthenticated requests to login
    const loginUrl = new URL("/login", request.url);
    // Remember redirect destination
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAuthPage) {
    // Redirect authenticated users away from login/register to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/incidents/:path*",
    "/hosts/:path*",
    "/models/:path*",
    "/runbooks/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
