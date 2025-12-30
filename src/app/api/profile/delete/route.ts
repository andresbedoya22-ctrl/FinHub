import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

type SupabaseLike = {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown | null }>;
    signOut: () => Promise<unknown>;
  };
  from: (table: string) => {
    update: (patch: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ data: unknown; error: { message: string } | null }> };
    delete: () => { eq: (col: string, val: string) => Promise<{ data: unknown; error: { message: string } | null }> };
  };
};

async function safeUpdateById(supabase: SupabaseLike, table: string, id: string, patch: Record<string, unknown>) {
  try {
    const { data, error } = await supabase.from(table).update(patch).eq("id", id);
    if (error) return { table, ok: false, error: error.message };
    return { table, ok: true, data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return { table, ok: false, error: msg };
  }
}

async function safeDeleteByUserId(supabase: SupabaseLike, table: string, userId: string) {
  try {
    const { data, error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) return { table, ok: false, error: error.message };
    return { table, ok: true, data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return { table, ok: false, error: msg };
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { confirm?: boolean };
    if (body.confirm !== true) {
      return NextResponse.json({ ok: false, error: "confirm=true es obligatorio." }, { status: 400 });
    }

    const supabase = (await createSupabaseServerClient()) as unknown as SupabaseLike;
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = data.user.id;

    const soft = await safeUpdateById(supabase, "profiles", userId, { deleted_at: new Date().toISOString() });

    const delDocs = await safeDeleteByUserId(supabase, "documents", userId);
    const delCases = await safeDeleteByUserId(supabase, "cases", userId);
    const delExtr = await safeDeleteByUserId(supabase, "document_extractions", userId);

    await supabase.auth.signOut();

    return NextResponse.json({
      ok: true,
      note: "Beta DSAR delete (best-effort). Some operations may fail depending on schema/columns.",
      results: {
        profiles_soft_delete: soft,
        documents_delete: delDocs,
        cases_delete: delCases,
        extractions_delete: delExtr,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
