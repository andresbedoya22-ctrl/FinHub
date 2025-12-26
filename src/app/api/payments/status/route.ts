import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export const dynamic = "force-dynamic";

type PaymentRow = {
  id: string;
  status: "created" | "pending" | "paid" | "failed" | "refunded";
  amount_cents: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const caseId = (url.searchParams.get("caseId") ?? "").toString().trim();

    if (!caseId) {
      return NextResponse.json({ ok: false, error: "caseId requerido" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("payments")
      .select("id,status,amount_cents,currency,created_at,updated_at")
      .eq("user_id", userData.user.id)
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    const status = (data?.status ?? "none") as string;
    const paid = status === "paid";

    return NextResponse.json({ ok: true, paid, status, payment: (data as PaymentRow | null) ?? null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
