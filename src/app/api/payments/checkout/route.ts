import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { assertStripeCheckoutEnv } from "@/config/env";

export const dynamic = "force-dynamic";

type ProductKey = "case_unlock";

const PRODUCTS: Record<ProductKey, { amountCents: number; currency: string; name: string }> = {
  // v1: precio fijo en servidor (evita manipulación del cliente).
  // Ajusta el monto cuando definas pricing final.
  case_unlock: { amountCents: 4900, currency: "EUR", name: "FinHub – Case Unlock" },
};

export async function POST(req: Request) {
  
  assertStripeCheckoutEnv();
try {
    const supabase = await createSupabaseServerClient();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    if (!userData.user) return NextResponse.json({ ok: false, error: "No authenticated user" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as
      | { caseId?: string; productKey?: string }
      | null;

    const caseId = (body?.caseId ?? "").toString().trim();
    const productKey = (body?.productKey ?? "").toString().trim() as ProductKey;

    if (!caseId) return NextResponse.json({ ok: false, error: "caseId requerido" }, { status: 400 });
    if (!productKey || !(productKey in PRODUCTS)) {
      return NextResponse.json({ ok: false, error: "productKey inválido" }, { status: 400 });
    }

    const p = PRODUCTS[productKey];

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ ok: false, error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });

    const stripe = new Stripe(secretKey);

    const origin = req.headers.get("origin") ?? "";
    if (!origin) return NextResponse.json({ ok: false, error: "Missing Origin header" }, { status: 400 });

    // URLs de retorno (v1)
    const successUrl = `${origin}/app/cases/${encodeURIComponent(caseId)}?payment=success`;
    const cancelUrl = `${origin}/app/cases/${encodeURIComponent(caseId)}?payment=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: p.currency.toLowerCase(),
            unit_amount: p.amountCents,
            product_data: { name: p.name },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userData.user.id,
        caseId,
        productKey,
      },
    });

    if (!session?.id || !session?.url) {
      return NextResponse.json({ ok: false, error: "Stripe session inválida" }, { status: 502 });
    }

    const now = new Date().toISOString();

    // Insert payment row (RLS: user_id = auth.uid()).
    // Si Stripe reintenta o el cliente repite, el índice único en stripe_session_id previene duplicados.
    const { error: insErr } = await supabase.from("payments").insert({
      user_id: userData.user.id,
      case_id: caseId,
      provider: "stripe",
      status: "created",
      amount_cents: p.amountCents,
      currency: p.currency,
      stripe_session_id: session.id,
      stripe_payment_intent_id: (session.payment_intent ?? null) as string | null,
      created_at: now,
      updated_at: now,
    });

    if (insErr) {
      // Si falló por duplicado, intentamos actualizar el registro existente.
      const { error: updErr } = await supabase
        .from("payments")
        .update({
          updated_at: now,
          stripe_payment_intent_id: (session.payment_intent ?? null) as string | null,
          status: "created",
        })
        .eq("stripe_session_id", session.id);

      if (updErr) {
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

