import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "tt_session";

// Optimistic gate only: it checks that a session cookie exists. Every admin page and
// action still validates the session against the database before doing anything.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname.startsWith("/admin/login");
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!isLogin && !hasSession) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    return NextResponse.redirect(new URL("/admin/login/", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
