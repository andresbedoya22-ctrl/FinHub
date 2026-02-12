import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/requireAdmin";
import { computeSlaBucket } from "@/features/cases/adminCasesSla";

export const dynamic = "force-dynamic";

type CaseAdminRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  step_key: string;
  authorization_status: string;
  updated_at: string;
  created_at: string;
};

function isMissingAuthorizationStatusColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  const lower = msg.toLowerCase();
  return lower.includes("authorization_status") && lower.includes("does not exist");
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.trim() || "";
  const type = searchParams.get("type")?.trim() || "";
  const authorizationStatus = searchParams.get("authorizationStatus")?.trim() || "";
  const sla = searchParams.get("sla")?.trim() || "";
  const q = searchParams.get("q")?.trim().toLowerCase() || "";

  let rows: CaseAdminRow[] = [];

  const query = auth.supabase
    .from("cases")
    .select("id,type,title,status,step_key,authorization_status,updated_at,created_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (status) query.eq("status", status);
  if (type) query.eq("type", type);
  if (authorizationStatus) query.eq("authorization_status", authorizationStatus);

  const first = await query;

  if (first.error && isMissingAuthorizationStatusColumn(first.error)) {
    const fallback = auth.supabase
      .from("cases")
      .select("id,type,title,status,step_key,updated_at,created_at")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (status) fallback.eq("status", status);
    if (type) fallback.eq("type", type);

    const second = await fallback;
    if (second.error) return NextResponse.json({ ok: false, error: second.error.message }, { status: 400 });

    rows = ((second.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id ?? ""),
      type: String(row.type ?? ""),
      title: String(row.title ?? ""),
      status: String(row.status ?? ""),
      step_key: String(row.step_key ?? ""),
      authorization_status: "not_started",
      updated_at: String(row.updated_at ?? ""),
      created_at: String(row.created_at ?? ""),
    }));
  } else {
    if (first.error) return NextResponse.json({ ok: false, error: first.error.message }, { status: 400 });
    rows = ((first.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id ?? ""),
      type: String(row.type ?? ""),
      title: String(row.title ?? ""),
      status: String(row.status ?? ""),
      step_key: String(row.step_key ?? ""),
      authorization_status: String(row.authorization_status ?? "not_started"),
      updated_at: String(row.updated_at ?? ""),
      created_at: String(row.created_at ?? ""),
    }));
  }

  if (authorizationStatus) {
    rows = rows.filter((row) => row.authorization_status === authorizationStatus);
  }

  if (q) {
    rows = rows.filter((r) =>
      [r.id, r.title, r.type, r.status, r.step_key, r.authorization_status].join(" ").toLowerCase().includes(q)
    );
  }

  const enriched = rows.map((row) => ({ ...row, sla_bucket: computeSlaBucket(row.updated_at) }));
  const filtered = sla ? enriched.filter((row) => row.sla_bucket === sla) : enriched;

  return NextResponse.json({ ok: true, rows: filtered });
}
