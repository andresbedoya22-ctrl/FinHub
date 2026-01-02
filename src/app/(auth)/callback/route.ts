import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { safePath } from "@/features/auth/safeRedirect";
import { getRequestOrigin } from "@/features/auth/origin";
import { trackProductEvent } from "@/features/observability/productTelemetry";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  const redirectToRaw =
    url.searchParams.get("redirectTo") ??
    url.searchParams.get("next");

  const redirectTo = safePath(redirectToRaw, "/app");
  const origin = getRequestOrigin(req);

  if (!code) {
    trackProductEvent("product.auth.oauth.fail", { route: "/callback", error_code: "missing_code" });
    return NextResponse.redirect(new URL(`/login?error=oauth&redirectTo=${encodeURIComponent(redirectTo)}`, origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    trackProductEvent("product.auth.oauth.fail", { route: "/callback", error_code: "oauth_failed" });
    return NextResponse.redirect(new URL(`/login?error=oauth&redirectTo=${encodeURIComponent(redirectTo)}`, origin));
  }

  trackProductEvent("product.auth.oauth.success", { route: "/callback" });
  return NextResponse.redirect(new URL(redirectTo, origin));
}