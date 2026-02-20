import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { resolveUserTenantId } from "@/features/tenant/tenantService";

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
    const admin = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = data.user;
    const tenantId = await resolveUserTenantId(supabase as never, user.id).catch(() => null);
    const correlationId = randomUUID();

    let requestId: string | null = null;
    if (tenantId) {
      const reqInsert = await admin
        .from("gdpr_requests")
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          request_type: "export",
          status: "processing",
          correlation_id: correlationId,
        })
        .select("id")
        .maybeSingle();
      if (!reqInsert.error && reqInsert.data?.id) requestId = String(reqInsert.data.id);
    }

    const tablesToTry = ["profiles", "tenant_members", "cases", "documents", "document_extractions", "consents", "payments"];

    const dumps: TableDump[] = [];
    for (const t of tablesToTry) {
      dumps.push(await safeSelect(supabase, t));
    }

    const exportedRows = dumps.reduce((acc, row) => acc + (row.count ?? 0), 0);
    if (requestId) {
      await admin
        .from("gdpr_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          result_meta: { tables: dumps.length, exportedRows },
        })
        .eq("id", requestId);
    }

    return NextResponse.json({
      ok: true,
      exportedAt: new Date().toISOString(),
      requestId,
      correlationId,
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      data: dumps,
      note: "GDPR export (best-effort). Some tables may be unavailable depending on schema.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
