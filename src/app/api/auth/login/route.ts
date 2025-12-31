import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { trackProductRoute } from "@/features/observability/productTelemetry";
const __FINHUB_TELEMETRY_ROUTE = "/api/auth/login";
const __FINHUB_TELEMETRY_PAIR = { success: "product.auth.login.success", fail: "product.auth.login.fail" } as const;
export async function POST(req: Request) {
  
  const __t0 = Date.now();
try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: false, error: "Email y contraseña son obligatorios." }, { status: 400 }));
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: false, error: error.message }, { status: 401 }));
    }

    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: true, userId: data.user?.id ?? null }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: false, error: msg }, { status: 500 }));
  }
}



