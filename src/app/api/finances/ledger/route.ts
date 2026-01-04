import { NextResponse } from "next/server";

import { supabaseRouteClient } from "@/lib/supabase/routeClient";

type LedgerCategory = {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  isSystem: boolean;
};

type LedgerTransaction = {
  id: string;
  occurredOn: string; // YYYY-MM-DD
  merchantName: string;
  merchantNorm: string;
  categoryId: string | null;
  amountCents: number;
  currency: "EUR";
  status: "pending" | "approved" | "hidden";
  source: "manual" | "ocr";
  note: string | null;
  reviewedAt: string | null;
};

type LedgerSplit = {
  id: string;
  transactionId: string;
  categoryId: string | null;
  splitAmountCents: number;
  note: string | null;
};

function toMonthString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function parseMonth(input: string | null): string {
  if (!input) return toMonthString(new Date());
  if (!/^\d{4}-\d{2}$/.test(input)) return toMonthString(new Date());
  return input;
}

function monthRange(month: string): { from: string; to: string } {
  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0); // last day
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = to.toISOString().slice(0, 10);
  return { from: fromIso, to: toIso };
}

export async function GET(req: Request) {
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const month = parseMonth(url.searchParams.get("month"));
  const { from, to } = monthRange(month);

  const uid = auth.user.id;

  const { data: categories, error: catErr } = await supabase
    .from("finance_categories")
    .select("id,key,label,sort_order,is_system")
    .eq("user_id", uid)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (catErr) {
    return NextResponse.json({ error: catErr.message }, { status: 500 });
  }

  const { data: transactions, error: txErr } = await supabase
    .from("finance_transactions")
    .select("id,occurred_on,merchant_name,merchant_norm,category_id,amount_cents,currency,status,source,note,reviewed_at")
    .eq("user_id", uid)
    .gte("occurred_on", from)
    .lte("occurred_on", to)
    .order("occurred_on", { ascending: false });

  if (txErr) {
    return NextResponse.json({ error: txErr.message }, { status: 500 });
  }

  const txIds = (transactions ?? []).map((t) => String(t.id));

  const splitsByTxId: Record<string, LedgerSplit[]> = {};
  if (txIds.length) {
    const { data: splits, error: splitErr } = await supabase
      .from("finance_transaction_splits")
      .select("id,transaction_id,category_id,split_amount_cents,note")
      .eq("user_id", uid)
      .in("transaction_id", txIds);

    if (splitErr) {
      return NextResponse.json({ error: splitErr.message }, { status: 500 });
    }

    for (const s of splits ?? []) {
      const txId = String(s.transaction_id);
      if (!splitsByTxId[txId]) splitsByTxId[txId] = [];
      splitsByTxId[txId].push({
        id: String(s.id),
        transactionId: txId,
        categoryId: s.category_id ? String(s.category_id) : null,
        splitAmountCents: Number(s.split_amount_cents),
        note: s.note ? String(s.note) : null,
      });
    }
  }

  const outCats: LedgerCategory[] = (categories ?? []).map((c) => ({
    id: String(c.id),
    key: String(c.key),
    label: String(c.label),
    sortOrder: Number(c.sort_order),
    isSystem: Boolean(c.is_system),
  }));

  const outTx: LedgerTransaction[] = (transactions ?? []).map((t) => ({
    id: String(t.id),
    occurredOn: String(t.occurred_on),
    merchantName: String(t.merchant_name),
    merchantNorm: String(t.merchant_norm),
    categoryId: t.category_id ? String(t.category_id) : null,
    amountCents: Number(t.amount_cents),
    currency: "EUR",
    status: String(t.status) as LedgerTransaction["status"],
    source: String(t.source) as LedgerTransaction["source"],
    note: t.note ? String(t.note) : null,
    reviewedAt: t.reviewed_at ? String(t.reviewed_at) : null,
  }));

  return NextResponse.json({
    month,
    range: { from, to },
    categories: outCats,
    transactions: outTx,
    splitsByTxId,
  });
}