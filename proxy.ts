import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "tt_session";

// Optimistic gate only: it checks that a session cookie exists. Every admin page and
// action still validates the session against the database before doing anything.
export function proxy(request: NextRequest) {
  // One address for search engines: www.travelersthoughts.com → travelersthoughts.com,
  // keeping the exact path (trailing slash included) and query string.
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = host.slice(4);
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

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
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    { source: "/:path*", has: [{ type: "host", value: "www\\..*" }] },
  ],
};
