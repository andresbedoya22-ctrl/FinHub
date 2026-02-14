import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "./src/lib/supabase/middleware";

function setSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()"
  );
  response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
}

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  setSecurityHeaders(response);

  // Auth gating happens in the dashboard layout; middleware should not rewrite
  // app routes to avoid route-resolution drift between dev/build.
  if (process.env.NODE_ENV === "development") {
    const pathname = request.nextUrl.pathname;
    if (pathname.startsWith("/app/")) {
      console.info("[proxy] pass-through", { pathname });
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
