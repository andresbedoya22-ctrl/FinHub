import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { trackProductRoute } from "@/features/observability/productTelemetry";
import { checkRateLimit } from "@/request-guards/rateLimit";

const __FINHUB_TELEMETRY_ROUTE = "/api/auth/resend-verification";
const __FINHUB_TELEMETRY_PAIR = {
  success: "product.auth.verify.resend.success",
  fail: "product.auth.verify.resend.fail",
} as const;

export async function POST(req: Request) {
  const __t0 = Date.now();

  // Rate limit: 5 / 30 min por IP (anti abuso)
  const rl = checkRateLimit(req, { keyPrefix: "auth:resend", limit: 5, windowMs: 30 * 60 * 1000 });
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

    const supabase = await createSupabaseServerClient();

    // supabase-js v2: resend signup confirmation
    const { error } = await supabase.auth.resend({ type: "signup", email });

    if (error) {
      return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE, error_code: "unknown" }, __t0,
        NextResponse.json({ ok: false, code: "unknown" }, { status: 400 })
      );
    }

    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: true }));
  } catch {
    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE, error_code: "unknown" }, __t0,
      NextResponse.json({ ok: false, code: "unknown" }, { status: 500 })
    );
  }
}