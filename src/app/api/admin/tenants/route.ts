import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";

export const dynamic = "force-dynamic";

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  created_at: string;
};

type MemberRow = {
  tenant_id: string;
  user_id: string;
  role: string;
  status: string;
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const admin = createSupabaseAdminClient();
    const tenantsQ = await admin
      .from("tenants")
      .select("id,slug,name,status,created_at")
      .order("created_at", { ascending: true });
    if (tenantsQ.error) throw new Error(tenantsQ.error.message);

    const membersQ = await admin.from("tenant_members").select("tenant_id,user_id,role,status");
    if (membersQ.error) throw new Error(membersQ.error.message);

    const tenants = (tenantsQ.data ?? []) as TenantRow[];
    const members = (membersQ.data ?? []) as MemberRow[];

    const rows = tenants.map((t) => {
      const tMembers = members.filter((m) => m.tenant_id === t.id);
      return {
        ...t,
        memberCount: tMembers.length,
        activeMembers: tMembers.filter((m) => m.status === "active").length,
        adminMembers: tMembers.filter((m) => m.role === "owner" || m.role === "admin").length,
      };
    });

    return NextResponse.json({ ok: true, rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load tenants";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
