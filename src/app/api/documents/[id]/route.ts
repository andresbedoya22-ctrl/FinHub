import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export const dynamic = "force-dynamic";

async function getIdFromParams(context: { params: Promise<{ id: string }> }) {
  const p = await context.params;
  const id = (p?.id ?? "").toString().trim();
  return id;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = await getIdFromParams(context);
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
  if (!userData.user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("documents")
    .select("id,user_id,case_id,file_name,type,status,notes,storage_path,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, doc: data });
}

type PatchBody = Partial<{
  status: string;
  caseId: string | null;
  notes: string;
}>;

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = await getIdFromParams(context);
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
  if (!userData.user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  let body: PatchBody = {};
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    body = {};
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.status === "string" && body.status.trim()) update.status = body.status.trim();
  if ("caseId" in body) update.case_id = body.caseId ?? null;
  if (typeof body.notes === "string") update.notes = body.notes;

  const { error } = await supabase.from("documents").update(update).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = await getIdFromParams(context);
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
  if (!userData.user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}