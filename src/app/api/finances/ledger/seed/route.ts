import { NextResponse } from "next/server";

import { supabaseRouteClient } from "@/lib/supabase/routeClient";

type SeedBody = { month?: string; count?: number };

function toMonthString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function parseMonth(input?: string): string {
  if (!input) return toMonthString(new Date());
  if (!/^\d{4}-\d{2}$/.test(input)) return toMonthString(new Date());
  return input;
}

function monthToDate(month: string, day: number): string {
  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = new Date(y, m - 1, day);
  return d.toISOString().slice(0, 10);
}

function normMerchant(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = (await req.json().catch(() => ({}))) as SeedBody;
  const month = parseMonth(raw.month);
  const count = clamp(Number(raw.count ?? 18), 5, 60);

  const uid = auth.user.id;

  // Ensure minimal categories exist (user scoped)
  const baseCats = [
    { key: "housing", label: "Vivienda", sort_order: 10 },
    { key: "groceries", label: "Supermercado", sort_order: 20 },
    { key: "transport", label: "Transporte", sort_order: 30 },
    { key: "subscriptions", label: "Suscripciones", sort_order: 40 },
    { key: "health", label: "Salud", sort_order: 50 },
    { key: "restaurants", label: "Restaurantes", sort_order: 60 },
  ];

  const { data: existing, error: exErr } = await supabase
    .from("finance_categories")
    .select("id,key")
    .eq("user_id", uid);

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

  const existingKeys = new Set((existing ?? []).map((c) => String(c.key)));
  const missing = baseCats.filter((c) => !existingKeys.has(c.key));

  if (missing.length) {
    const { error: insCatErr } = await supabase.from("finance_categories").insert(
      missing.map((c) => ({
        user_id: uid,
        key: c.key,
        label: c.label,
        sort_order: c.sort_order,
        is_system: false,
      }))
    );
    if (insCatErr) return NextResponse.json({ error: insCatErr.message }, { status: 500 });
  }

  const { data: cats, error: catErr } = await supabase
    .from("finance_categories")
    .select("id,key")
    .eq("user_id", uid);

  if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 });

  const byKey: Record<string, string> = {};
  for (const c of cats ?? []) byKey[String(c.key)] = String(c.id);

  const merchants = [
    { name: "Albert Heijn", key: "groceries" },
    { name: "Jumbo", key: "groceries" },
    { name: "NS", key: "transport" },
    { name: "Shell", key: "transport" },
    { name: "Ziggo", key: "subscriptions" },
    { name: "Spotify", key: "subscriptions" },
    { name: "Etos", key: "health" },
    { name: "Apotheek", key: "health" },
    { name: "Thuisbezorgd", key: "restaurants" },
    { name: "Coffee bar", key: "restaurants" },
    { name: "Huur", key: "housing" },
  ];

  
  if (!merchants.length) {
    throw new Error("seedLedger: merchants list is empty")
  }
// Generate txs
  const rows = Array.from({ length: count }).map((_, i) => {
    const m = merchants[i % merchants.length]!;
    const day = 1 + (i % 26);
    const amount = m.key === "housing" ? -110000 : -(500 + (i * 137) % 8500); // cents, negative outflow
    const merchantName = m.name;
    return {
      user_id: uid,
      occurred_on: monthToDate(month, day),
      merchant_name: merchantName,
      merchant_norm: normMerchant(merchantName),
      category_id: byKey[m.key] ?? null,
      amount_cents: amount,
      currency: "EUR",
      status: "pending",
      source: "manual",
      note: null,
      reviewed_at: null,
    };
  });

  const { error: txErr } = await supabase.from("finance_transactions").insert(rows);
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, month, inserted: rows.length });
}