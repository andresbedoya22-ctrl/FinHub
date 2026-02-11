import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/requireAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { note?: string };
  const note = (body.note ?? "").trim();

  if (note.length < 2) {
    return NextResponse.json({ ok: false, error: "Note too short" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("case_notes")
    .insert({
      case_id: id,
      author_user_id: auth.userId,
      note,
    })
    .select("id,case_id,author_user_id,note,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, note: data });
}
