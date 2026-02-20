import type { SupabaseClient } from "@supabase/supabase-js";

type TenantMemberRow = {
  tenant_id: string;
  role: string;
  status: string;
  is_default: boolean;
  created_at: string;
};

export type UserTenantScope = {
  tenantId: string | null;
  role: "owner" | "admin" | "agent" | "viewer" | null;
};

function isMissingTenantSchema(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const lower = message.toLowerCase();
  if (lower.includes("tenant_members") && lower.includes("does not exist")) return true;
  if (lower.includes("table 'public.tenant_members'") && lower.includes("schema cache")) return true;
  if (code.toUpperCase().startsWith("PGRST") && lower.includes("tenant_members") && lower.includes("schema cache")) {
    return true;
  }
  return false;
}

function toRole(raw: string): UserTenantScope["role"] {
  if (raw === "owner" || raw === "admin" || raw === "agent" || raw === "viewer") return raw;
  return null;
}

export async function resolveUserTenantScope(
  supabase: SupabaseClient,
  userId: string
): Promise<UserTenantScope> {
  const query = await supabase
    .from("tenant_members")
    .select("tenant_id,role,status,is_default,created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (query.error) {
    if (isMissingTenantSchema(query.error)) return { tenantId: null, role: null };
    throw new Error(query.error.message);
  }

  const row = query.data as TenantMemberRow | null;
  if (!row?.tenant_id) return { tenantId: null, role: null };
  return { tenantId: row.tenant_id, role: toRole(String(row.role ?? "")) };
}

export async function resolveUserTenantId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const scope = await resolveUserTenantScope(supabase, userId);
  return scope.tenantId;
}
