import { NextResponse } from "next/server";

import { supabaseRouteClient } from "@/lib/supabase/routeClient";
import { toSignedAmountCents } from "@/features/finances/transactionsAmount";

type CreateTxBody = {
  occurredOn: string; // YYYY-MM-DD
  merchantName: string;
  categoryId?: string | null;
  amountCents: number; // absolute amount cents
  direction?: "income" | "expense";
  note?: string | null;
};

function isCreateTxBody(x: unknown): x is CreateTxBody {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.occurredOn !== "string") return false;
  if (typeof o.merchantName !== "string") return false;
  if (typeof o.amountCents !== "number") return false;
  if (o.direction !== undefined && o.direction !== "income" && o.direction !== "expense") return false;
  return true;
}

function unwrapInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  if ("input" in o) return o.input;
  return raw;
}

function normMerchant(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw0 = (await req.json().catch(() => null)) as unknown;
  const raw = unwrapInput(raw0);

  if (!isCreateTxBody(raw)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const occurredOn = raw.occurredOn;
  const merchantName = raw.merchantName.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
    return NextResponse.json({ error: "occurredOn must be YYYY-MM-DD" }, { status: 400 });
  }
  if (!merchantName) return NextResponse.json({ error: "merchantName required" }, { status: 400 });

  const uid = auth.user.id;

  const signedAmount = toSignedAmountCents(raw.amountCents, raw.direction ?? "expense");

  const { data, error } = await supabase
    .from("finance_transactions")
    .insert({
      user_id: uid,
      occurred_on: occurredOn,
      merchant_name: merchantName,
      merchant_norm: normMerchant(merchantName),
      category_id: raw.categoryId ?? null,
      amount_cents: signedAmount,
      currency: "EUR",
      status: "pending",
      source: "manual",
      note: raw.note ?? null,
      reviewed_at: null,
    })
    .select("id,occurred_on,merchant_name,merchant_norm,category_id,amount_cents,currency,status,source,note,reviewed_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Insert failed" }, { status: 500 });

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
