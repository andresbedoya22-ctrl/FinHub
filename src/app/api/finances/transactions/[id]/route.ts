import { NextResponse } from "next/server";

import { createRouteClient } from "@/lib/supabase/routeClient";

type PatchBody = {
  categoryId?: string | null;
  status?: "pending" | "approved" | "hidden";
  note?: string | null;
  reviewedAt?: string | null;
};

function isPatchBody(x: unknown): x is PatchBody {
  return !!x && typeof x === "object";
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const raw = (await req.json().catch(() => null)) as unknown;
  if (!isPatchBody(raw)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  const body = raw as PatchBody;

  if ("categoryId" in body) patch.category_id = body.categoryId ?? null;
  if ("status" in body) patch.status = body.status;
  if ("note" in body) patch.note = body.note ?? null;
  if ("reviewedAt" in body) patch.reviewed_at = body.reviewedAt ?? null;

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("finance_transactions")
    .update(patch)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id,occurred_on,merchant_name,merchant_norm,category_id,amount_cents,currency,status,source,note,reviewed_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: String(data.id),
    occurredOn: String(data.occurred_on),
    merchantName: String(data.merchant_name),
    merchantNorm: String(data.merchant_norm),
    categoryId: data.category_id ? String(data.category_id) : null,
    amountCents: Number(data.amount_cents),
    currency: "EUR",
    status: String(data.status),
    source: String(data.source),
    note: data.note ? String(data.note) : null,
    reviewedAt: data.reviewed_at ? String(data.reviewed_at) : null,
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const { error } = await supabase
    .from("finance_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}