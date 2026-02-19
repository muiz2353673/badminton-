import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "admin_logged_in";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin but allow /admin/login
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const loggedIn = request.cookies.get(ADMIN_COOKIE)?.value === "1";
    if (!loggedIn) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
