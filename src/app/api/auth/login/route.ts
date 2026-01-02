import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { trackProductRoute } from "@/features/observability/productTelemetry";
import { checkRateLimit } from "@/request-guards/rateLimit";
import { mapSupabaseAuthError } from "@/features/auth/authErrors";

const __FINHUB_TELEMETRY_ROUTE = "/api/auth/login";
const __FINHUB_TELEMETRY_PAIR = {
  success: "product.auth.login.success",
  fail: "product.auth.login.fail",
} as const;

export async function POST(req: Request) {
  const __t0 = Date.now();

  // Rate limit: 10 / 5 min por IP (ajustable)
  const rl = checkRateLimit(req, { keyPrefix: "auth:login", limit: 10, windowMs: 5 * 60 * 1000 });
  if (rl.limited) {
    const res = NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429 });
    res.headers.set("Retry-After", String(rl.retryAfterSec));
    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE, error_code: "rate_limited" }, __t0, res);
  }

  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return trackProductRoute(
        __FINHUB_TELEMETRY_PAIR,
        { route: __FINHUB_TELEMETRY_ROUTE, error_code: "invalid_request" },
        __t0,
        NextResponse.json({ ok: false, code: "invalid_request" }, { status: 400 })
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const mapped = mapSupabaseAuthError(error);
      return trackProductRoute(
        __FINHUB_TELEMETRY_PAIR,
        { route: __FINHUB_TELEMETRY_ROUTE, error_code: mapped.code },
        __t0,
        NextResponse.json({ ok: false, code: mapped.code }, { status: mapped.status })
      );
    }

    return trackProductRoute(
      __FINHUB_TELEMETRY_PAIR,
      { route: __FINHUB_TELEMETRY_ROUTE },
      __t0,
      NextResponse.json({ ok: true, userId: data.user?.id ?? null })
    );
  } catch {
    return trackProductRoute(
      __FINHUB_TELEMETRY_PAIR,
      { route: __FINHUB_TELEMETRY_ROUTE, error_code: "unknown" },
      __t0,
      NextResponse.json({ ok: false, code: "unknown" }, { status: 500 })
    );
  }
}