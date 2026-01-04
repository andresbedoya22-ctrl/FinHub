import { NextResponse } from "next/server";

import { createRouteClient } from "@/lib/supabase/routeClient";

type SplitIn = {
  categoryId: string | null;
  splitAmountCents: number;
  note: string | null;
};

function isArrayOfSplits(x: unknown): x is SplitIn[] {
  if (!Array.isArray(x)) return false;
  for (const it of x) {
    if (!it || typeof it !== "object") return false;
    const o = it as Record<string, unknown>;
    if (!("splitAmountCents" in o) || typeof o.splitAmountCents !== "number") return false;
  }
  return true;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const { data, error } = await supabase
    .from("finance_transaction_splits")
    .select("id,transaction_id,category_id,split_amount_cents,note")
    .eq("user_id", auth.user.id)
    .eq("transaction_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map((s) => ({
      id: String(s.id),
      transactionId: String(s.transaction_id),
      categoryId: s.category_id ? String(s.category_id) : null,
      splitAmountCents: Number(s.split_amount_cents),
      note: s.note ? String(s.note) : null,
    }))
  );
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const raw = (await req.json().catch(() => null)) as unknown;
  if (!isArrayOfSplits(raw)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { error: delErr } = await supabase
    .from("finance_transaction_splits")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("transaction_id", id);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (!raw.length) return NextResponse.json({ ok: true, splits: [] });

  const rows = raw.map((s) => ({
    user_id: auth.user.id,
    transaction_id: id,
    category_id: s.categoryId ?? null,
    split_amount_cents: s.splitAmountCents,
    note: s.note ?? null,
  }));

  const { data, error: insErr } = await supabase
    .from("finance_transaction_splits")
    .insert(rows)
    .select("id,transaction_id,category_id,split_amount_cents,note");

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    splits: (data ?? []).map((s) => ({
      id: String(s.id),
      transactionId: String(s.transaction_id),
      categoryId: s.category_id ? String(s.category_id) : null,
      splitAmountCents: Number(s.split_amount_cents),
      note: s.note ? String(s.note) : null,
    })),
  });
}