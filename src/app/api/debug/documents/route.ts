import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user ?? null;

    const { data: docs, error: docsError, count } = await supabase
      .from("documents")
      .select("id,user_id,case_id,file_name,type,status,storage_path,ocr_kind,created_at,updated_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      user: user ? { id: user.id, email: user.email ?? null } : null,
      userError: userError?.message ?? null,
      count: count ?? null,
      docsError: docsError?.message ?? null,
      docs: docs ?? [],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}