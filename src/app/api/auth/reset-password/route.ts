import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { trackProductRoute } from "@/features/observability/productTelemetry";
import { checkRateLimit } from "@/request-guards/rateLimit";

const __FINHUB_TELEMETRY_ROUTE = "/api/auth/reset-password";
const __FINHUB_TELEMETRY_PAIR = {
  success: "product.auth.password_reset.update.success",
  fail: "product.auth.password_reset.update.fail",
} as const;

export async function POST(req: Request) {
  const __t0 = Date.now();

  // Rate limit: 10 / 10 min por IP
  const rl = checkRateLimit(req, { keyPrefix: "auth:reset", limit: 10, windowMs: 10 * 60 * 1000 });
  if (rl.limited) {
    const res = NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429 });
    res.headers.set("Retry-After", String(rl.retryAfterSec));
    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE, error_code: "rate_limited" }, __t0, res);
  }

  try {
    const body = (await req.json()) as { code?: string; password?: string };
    const code = String(body.code || "").trim();
    const password = String(body.password || "");

    if (!code) {
      return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE, error_code: "missing_code" }, __t0,
        NextResponse.json({ ok: false, code: "missing_code" }, { status: 400 })
      );
    }
    if (!password) {
      return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE, error_code: "invalid_request" }, __t0,
        NextResponse.json({ ok: false, code: "invalid_request" }, { status: 400 })
      );
    }

    const supabase = await createSupabaseServerClient();

    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) {
      return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE, error_code: "unknown" }, __t0,
        NextResponse.json({ ok: false, code: "unknown" }, { status: 400 })
      );
    }

    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE, error_code: "weak_password" }, __t0,
        NextResponse.json({ ok: false, code: "weak_password" }, { status: 400 })
      );
    }

    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: true }));
  } catch {
    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE, error_code: "unknown" }, __t0,
      NextResponse.json({ ok: false, code: "unknown" }, { status: 500 })
    );
  }
}