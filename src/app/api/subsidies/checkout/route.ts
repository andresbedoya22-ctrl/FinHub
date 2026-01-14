import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { assertStripeCheckoutEnv } from "@/config/env";
import { getSubsidyPolicy2026 } from "@/lib/db/subsidies/policy";
import { isSubsidySlug } from "@/domain/subsidies/registry";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  assertStripeCheckoutEnv();
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    if (!userData.user) return NextResponse.json({ ok: false, error: "No authenticated user" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as
      | { applicationId?: string; slug?: string }
      | null;

    const applicationId = (body?.applicationId ?? "").toString().trim();
    const slug = (body?.slug ?? "").toString().trim();
    if (!applicationId) return NextResponse.json({ ok: false, error: "applicationId requerido" }, { status: 400 });
    if (!isSubsidySlug(slug)) return NextResponse.json({ ok: false, error: "slug inválido" }, { status: 400 });

    const { data: app, error: appErr } = await supabase
      .from("subsidies_applications")
      .select("id,user_id")
      .eq("id", applicationId)
      .maybeSingle();

    if (appErr) return NextResponse.json({ ok: false, error: appErr.message }, { status: 400 });
    if (!app || app.user_id !== userData.user.id) {
      return NextResponse.json({ ok: false, error: "Aplicación no válida" }, { status: 403 });
    }

    const policy = await getSubsidyPolicy2026();
    const { serviceFeeCents, currency } = policy.pricing;

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ ok: false, error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });

    const stripe = new Stripe(secretKey);
    const origin = req.headers.get("origin") ?? "";
    if (!origin) return NextResponse.json({ ok: false, error: "Missing Origin header" }, { status: 400 });

    const successUrl = `${origin}/app/subsidies/applications/${encodeURIComponent(applicationId)}?payment=success`;
    const cancelUrl = `${origin}/app/subsidies/${encodeURIComponent(slug)}/checkout?applicationId=${encodeURIComponent(
      applicationId
    )}&payment=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: serviceFeeCents,
            product_data: { name: "FinHub – Subsidy Service" },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userData.user.id,
        subsidyApplicationId: applicationId,
        subsidySlug: slug,
        productKey: "subsidy_service",
      },
    });

    if (!session?.id || !session?.url) {
      return NextResponse.json({ ok: false, error: "Stripe session inválida" }, { status: 502 });
    }

    const now = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("subsidies_applications")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: (session.payment_intent ?? null) as string | null,
        updated_at: now,
      })
      .eq("id", applicationId);

    if (updateErr) return NextResponse.json({ ok: false, error: updateErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
