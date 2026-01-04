import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { trackProductRoute } from "@/features/observability/productTelemetry";
import { checkRateLimit } from "@/request-guards";
import { mapSupabaseAuthError } from "@/features/auth/authErrors";

const __FINHUB_TELEMETRY_ROUTE = "/api/auth/register";
const __FINHUB_TELEMETRY_PAIR = {
  success: "product.auth.register.success",
  fail: "product.auth.register.fail",
} as const;

export async function POST(req: Request) {
  const __t0 = Date.now();

  // Rate limit: 6 / 10 min por IP
  const rl = checkRateLimit(req, {
    keyPrefix: "auth:register",
    limit: 6,
    windowMs: 10 * 60 * 1000,
  });

  if (rl.limited) {
    const res = NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429 });
    res.headers.set("Retry-After", String(rl.retryAfterSec));
    return trackProductRoute(
      __FINHUB_TELEMETRY_PAIR,
      { route: __FINHUB_TELEMETRY_ROUTE, error_code: "rate_limited" },
      __t0,
      res
    );
  }

  try {
    const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return trackProductRoute(
        __FINHUB_TELEMETRY_PAIR,
        { route: __FINHUB_TELEMETRY_ROUTE, error_code: "missing_fields" },
        __t0,
        NextResponse.json({ ok: false, code: "missing_fields" }, { status: 400 })
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      const mapped = mapSupabaseAuthError(error);
      return trackProductRoute(
        __FINHUB_TELEMETRY_PAIR,
        { route: __FINHUB_TELEMETRY_ROUTE, error_code: mapped.code },
        __t0,
        NextResponse.json({ ok: false, code: mapped.code }, { status: mapped.status })
      );
    }

    // Si tu proyecto requiere confirmación por email, puede no haber sesión todavía.
    const needsVerify = !data.session;

    return trackProductRoute(
      __FINHUB_TELEMETRY_PAIR,
      { route: __FINHUB_TELEMETRY_ROUTE },
      __t0,
      NextResponse.json(
        {
          ok: true,
          userId: data.user?.id ?? null,
          ...(needsVerify ? { code: "email_verification_sent" } : null),
        },
        { status: 200 }
      )
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
