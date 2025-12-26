import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";

export const dynamic = "force-dynamic";

function normalizeStatus(eventType: string): "paid" | "failed" | "pending" {
  if (eventType === "checkout.session.completed") return "paid";
  if (eventType === "checkout.session.expired") return "failed";
  if (eventType === "payment_intent.payment_failed") return "failed";
  return "pending";
}

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) return NextResponse.json({ ok: false, error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    if (!webhookSecret) return NextResponse.json({ ok: false, error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });

    const stripe = new Stripe(secretKey);

    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ ok: false, error: "Missing stripe-signature" }, { status: 400 });

    const rawBody = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Webhook signature verification failed";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    // Handle relevant event types
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;

      const stripeSessionId = session.id;
      const paymentIntentId = (session.payment_intent ?? null) as string | null;

      const userId = (session.metadata?.userId ?? "").toString();
      const caseId = (session.metadata?.caseId ?? "").toString() || null;

      const status = normalizeStatus(event.type);

      // Prefer update by session id (unique index)
      const { data: existing } = await admin
        .from("payments")
        .select("id")
        .eq("stripe_session_id", stripeSessionId)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await admin
          .from("payments")
          .update({
            status,
            stripe_payment_intent_id: paymentIntentId,
            updated_at: now,
          })
          .eq("id", existing.id);

        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      } else {
        // Fallback insert (requires metadata)
        if (!userId) return NextResponse.json({ ok: false, error: "Missing userId metadata" }, { status: 400 });

        // amount_total is in cents
        const amountCents = typeof session.amount_total === "number" ? session.amount_total : 0;
        const currency = (session.currency ?? "eur").toString().toUpperCase();

        const { error } = await admin.from("payments").insert({
          user_id: userId,
          case_id: caseId,
          provider: "stripe",
          status,
          amount_cents: amountCents,
          currency,
          stripe_session_id: stripeSessionId,
          stripe_payment_intent_id: paymentIntentId,
          created_at: now,
          updated_at: now,
        });

        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true });
    }

    if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;

      const paymentIntentId = pi.id;
      const status = event.type === "payment_intent.succeeded" ? "paid" : "failed";

      // Update by payment_intent (unique index)
      const { error } = await admin
        .from("payments")
        .update({ status, updated_at: now })
        .eq("stripe_payment_intent_id", paymentIntentId);

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

      return NextResponse.json({ ok: true });
    }

    // Ignore other event types
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
