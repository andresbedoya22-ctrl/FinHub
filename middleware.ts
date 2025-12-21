import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "./src/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const response = await updateSession(request);

  const isProtected = pathname.startsWith("/app") || pathname.startsWith("/admin");
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

  if (!isProtected && !isAuthRoute) return response;

  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));

  if (isProtected && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/cases";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/login", "/register"],
};
