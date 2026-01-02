import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { safePath } from "@/features/auth/safeRedirect";
import { getRequestOrigin } from "@/features/auth/origin";
import { checkRateLimit } from "@/request-guards";

type Provider = "google" | "apple";

export async function GET(req: Request) {
  // Rate limit básico para evitar abuso (por IP)
  const rl = checkRateLimit(req, { keyPrefix: "auth_oauth_start", limit: 30, windowMs: 10 * 60 * 1000 });
  if (rl.limited) {
    return NextResponse.json(
      { ok: false, code: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const u = new URL(req.url);
  const providerRaw = (u.searchParams.get("provider") ?? "").toLowerCase();
  const provider = (providerRaw === "google" || providerRaw === "apple") ? (providerRaw as Provider) : null;

  const redirectToRaw = u.searchParams.get("redirectTo") ?? u.searchParams.get("next");
  const redirectTo = safePath(redirectToRaw, "/app");

  const origin = getRequestOrigin(req);

  if (!provider) {
    return NextResponse.json({ ok: false, code: "invalid_provider" }, { status: 400 });
  }

  // Importante: redirectTo del provider SIEMPRE vuelve a /callback (server exchange)
  const callbackUrl = `${origin}/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl },
  });

  if (error || !data?.url) {
    return NextResponse.redirect(new URL(`/login?error=oauth&redirectTo=${encodeURIComponent(redirectTo)}`, origin));
  }

  // Redirect a Supabase/Provider URL
  return NextResponse.redirect(data.url);
}