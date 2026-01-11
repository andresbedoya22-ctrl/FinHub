import { NextResponse } from "next/server";

import { supabaseRouteClient } from "@/lib/supabase/routeClient";

type SplitIn = {
  categoryId: string | null;
  splitAmountCents: number;
  note: string | null;
};

function isSplitIn(x: unknown): x is SplitIn {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (!("splitAmountCents" in o) || typeof o.splitAmountCents !== "number") return false;
  if ("categoryId" in o && o.categoryId !== null && typeof o.categoryId !== "string") return false;
  if ("note" in o && o.note !== null && typeof o.note !== "string") return false;
  return true;
}

function normalizeSplitsBody(raw: unknown): SplitIn[] | null {
  // Accept:
  // 1) [ { splitAmountCents, categoryId?, note? }, ... ]
  // 2) { splits: [ ... ] }
  let candidate: unknown = raw;

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if ("splits" in o) candidate = o.splits;
  }

  if (!Array.isArray(candidate)) return null;

  const out: SplitIn[] = [];
  for (const it of candidate) {
    if (!isSplitIn(it)) return null;
    out.push({
      categoryId: it.categoryId ?? null,
      splitAmountCents: it.splitAmountCents,
      note: it.note ?? null,
    });
  }
  return out;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await supabaseRouteClient();
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
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const raw = (await req.json().catch(() => null)) as unknown;
  const splits = normalizeSplitsBody(raw);
  if (!splits) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { error: delErr } = await supabase
    .from("finance_transaction_splits")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("transaction_id", id);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (!splits.length) {
    return NextResponse.json({ ok: true, splits: [] });
  }

  const rows = splits.map((s) => ({
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