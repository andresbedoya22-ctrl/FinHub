import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/requireAdmin";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(["open", "in_progress", "done"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id, taskId } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = (body.status ?? "").trim();

  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("case_tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("case_id", id)
    .select("id,case_id,title,status,due_at,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, task: data });
}
