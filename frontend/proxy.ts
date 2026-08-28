import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.cookies.has("amajia_session")) return NextResponse.next();
  const welcome = new URL("/welcome", request.url);
  welcome.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(welcome);
}

export const config = {
  matcher: [
    "/",
    "/choose-mode/:path*",
    "/coach/:path*",
    "/search/:path*",
    "/housekeeping/:path*",
    "/assessment/:path*",
    "/learn/:path*",
    "/ask/:path*",
    "/records/:path*",
    "/report/:path*",
    "/tools/:path*",
    "/account/:path*",
    "/career-path/:path*",
  ],
};
