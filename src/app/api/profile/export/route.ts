import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

type TableDump = {
  table: string;
  ok: boolean;
  count?: number;
  error?: string;
  rows?: unknown[];
};

type SupabaseLike = {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string; email?: string | null } | null }; error: unknown | null }>;
  };
  from: (table: string) => {
    select: (cols: string) => { limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }> };
  };
};

async function safeSelect(supabase: SupabaseLike, table: string, limit = 2000): Promise<TableDump> {
  try {
    const { data, error } = await supabase.from(table).select("*").limit(limit);
    if (error) return { table, ok: false, error: error.message };
    return { table, ok: true, count: Array.isArray(data) ? data.length : 0, rows: data ?? [] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return { table, ok: false, error: msg };
  }
}

export async function GET() {
  try {
    const supabase = (await createSupabaseServerClient()) as unknown as SupabaseLike;
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = data.user;

    const tablesToTry = ["profiles", "cases", "documents", "document_extractions", "audit_logs", "audit_log"];

    const dumps: TableDump[] = [];
    for (const t of tablesToTry) {
      dumps.push(await safeSelect(supabase, t));
    }

    return NextResponse.json({
      ok: true,
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      data: dumps,
      note: "Beta DSAR export (best-effort). Some tables may be unavailable depending on schema.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
