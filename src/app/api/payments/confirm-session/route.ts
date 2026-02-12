import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { assertStripeCheckoutEnv } from "@/config/env";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  assertStripeCheckoutEnv();

  try {
    const body = (await req.json().catch(() => null)) as { sessionId?: string; caseId?: string } | null;
    const sessionId = String(body?.sessionId ?? "").trim();
    const caseId = String(body?.caseId ?? "").trim();

    if (!sessionId || !caseId) {
      return NextResponse.json({ ok: false, error: "sessionId and caseId required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ ok: false, error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.id !== sessionId) {
      return NextResponse.json({ ok: false, error: "checkout_session_not_found" }, { status: 404 });
    }

    const metaUserId = String(session.metadata?.userId ?? "").trim();
    const metaCaseId = String(session.metadata?.caseId ?? "").trim();

    if (metaUserId && metaUserId !== auth.user.id) {
      return NextResponse.json({ ok: false, error: "forbidden_user_mismatch" }, { status: 403 });
    }

    if (metaCaseId && metaCaseId !== caseId) {
      return NextResponse.json({ ok: false, error: "forbidden_case_mismatch" }, { status: 403 });
    }

    const status = session.payment_status === "paid" ? "paid" : "pending";
    const now = new Date().toISOString();

    const admin = createSupabaseAdminClient();

    const upd = await admin
      .from("payments")
      .update({
        status,
        stripe_payment_intent_id: (session.payment_intent ?? null) as string | null,
        updated_at: now,
      })
      .eq("stripe_session_id", sessionId)
      .eq("case_id", caseId)
      .eq("user_id", auth.user.id);

    if (upd.error) {
      return NextResponse.json({ ok: false, error: upd.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, paid: status === "paid", status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "confirm_session_failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
