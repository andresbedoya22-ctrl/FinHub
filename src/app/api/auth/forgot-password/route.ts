import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { trackProductRoute } from "@/features/observability/productTelemetry";
import { checkRateLimit } from "@/request-guards/rateLimit";
import { getRequestOrigin } from "@/features/auth/origin";

const __FINHUB_TELEMETRY_ROUTE = "/api/auth/forgot-password";
const __FINHUB_TELEMETRY_PAIR = {
  success: "product.auth.password_reset.request.success",
  fail: "product.auth.password_reset.request.fail",
} as const;

export async function POST(req: Request) {
  const __t0 = Date.now();

  // Rate limit: 6 / 10 min por IP
  const rl = checkRateLimit(req, { keyPrefix: "auth:forgot", limit: 6, windowMs: 10 * 60 * 1000 });
  if (rl.limited) {
    const res = NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429 });
    res.headers.set("Retry-After", String(rl.retryAfterSec));
    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE, error_code: "rate_limited" }, __t0, res);
  }

  try {
    const body = (await req.json()) as { email?: string };
    const email = String(body.email || "").trim();
    if (!email) {
      return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE, error_code: "invalid_request" }, __t0,
        NextResponse.json({ ok: false, code: "invalid_request" }, { status: 400 })
      );
    }

    const origin = getRequestOrigin(req);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE, error_code: "unknown" }, __t0,
        NextResponse.json({ ok: false, code: "unknown" }, { status: 500 })
      );
    }

    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: true }));
  } catch {
    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE, error_code: "unknown" }, __t0,
      NextResponse.json({ ok: false, code: "unknown" }, { status: 500 })
    );
  }
}