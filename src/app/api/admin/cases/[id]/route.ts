import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/requireAdmin";

export const dynamic = "force-dynamic";

function isMissingAuthorizationStatusColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  const lower = msg.toLowerCase();
  return lower.includes("authorization_status") && lower.includes("does not exist");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id } = await params;

  let { data: caseRow, error: caseErr } = await auth.supabase
    .from("cases")
    .select("id,type,title,status,step_key,authorization_status,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (caseErr && isMissingAuthorizationStatusColumn(caseErr)) {
    const fallback = await auth.supabase
      .from("cases")
      .select("id,type,title,status,step_key,created_at,updated_at")
      .eq("id", id)
      .maybeSingle();

    caseErr = fallback.error;
    caseRow = fallback.data ? { ...fallback.data, authorization_status: "not_started" } : null;
  }

  if (caseErr) return NextResponse.json({ ok: false, error: caseErr.message }, { status: 400 });
  if (!caseRow) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { data: tasks, error: tasksErr } = await auth.supabase
    .from("case_tasks")
    .select("id,case_id,title,status,due_at,created_at,updated_at")
    .eq("case_id", id)
    .order("created_at", { ascending: true });

  if (tasksErr) return NextResponse.json({ ok: false, error: tasksErr.message }, { status: 400 });

  const { data: documents, error: docsErr } = await auth.supabase
    .from("case_documents")
    .select(
      "id,case_id,document_id,status,validation_reason,validated_at,rejected_at,synced_at,created_at,updated_at,document:documents(id,file_name,type,status,created_at,updated_at)"
    )
    .eq("case_id", id)
    .eq("status", "validated")
    .order("created_at", { ascending: true });

  if (docsErr) return NextResponse.json({ ok: false, error: docsErr.message }, { status: 400 });

  const { data: notes, error: notesErr } = await auth.supabase
    .from("case_notes")
    .select("id,case_id,author_user_id,note,created_at,updated_at")
    .eq("case_id", id)
    .order("created_at", { ascending: false });

  if (notesErr) return NextResponse.json({ ok: false, error: notesErr.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    case: {
      ...caseRow,
      authorization_status:
        (caseRow as { authorization_status?: string | null }).authorization_status ?? "not_started",
    },
    tasks: tasks ?? [],
    documents: documents ?? [],
    notes: notes ?? [],
  });
}
