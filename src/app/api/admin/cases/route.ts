import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/requireAdmin";
import { computeSlaBucket } from "@/features/cases/adminCasesSla";

export const dynamic = "force-dynamic";

type CaseRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  step_key: string;
  authorization_status: string;
  updated_at: string;
  created_at: string;
};

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.trim() ?? "";
  const type = searchParams.get("type")?.trim() ?? "";
  const authorizationStatus = searchParams.get("authorizationStatus")?.trim() ?? "";
  const sla = searchParams.get("sla")?.trim() ?? "";
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  let query = auth.supabase
    .from("cases")
    .select("id,type,title,status,step_key,authorization_status,updated_at,created_at")
    .order("updated_at", { ascending: false })
    .limit(300);

  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);
  if (authorizationStatus) query = query.eq("authorization_status", authorizationStatus);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  let rows = (data ?? []) as CaseRow[];

  if (q) {
    rows = rows.filter((r) =>
      [r.id, r.title, r.type, r.status, r.step_key, r.authorization_status].join(" ").toLowerCase().includes(q)
    );
  }

  const enriched = rows.map((row) => ({ ...row, sla_bucket: computeSlaBucket(row.updated_at) }));
  const filtered = sla ? enriched.filter((row) => row.sla_bucket === sla) : enriched;

  return NextResponse.json({ ok: true, rows: filtered });
}
