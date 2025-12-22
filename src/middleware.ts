import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si falta configuración, no bloqueamos (para no romper entornos locales)
  if (!url || !anonKey) return NextResponse.next();

  const response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
const fullPath = `${request.nextUrl.pathname}${request.nextUrl.search || ""}`;
redirectUrl.searchParams.set("redirectTo", fullPath);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*"],
};
