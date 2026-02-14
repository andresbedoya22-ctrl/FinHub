import type { SupabaseClient } from "@supabase/supabase-js";

export type TenantBusinessMetrics = {
  tenantId: string;
  slug: string;
  name: string;
  members: number;
  activeMembers: number;
  newCases30d: number;
  taxesCases30d: number;
  leadgenCases30d: number;
  productEvents30d: number;
  gdprExports30d: number;
  gdprDeletes30d: number;
};

function isMissingRelation(error: unknown, relation: string): boolean {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const lower = message.toLowerCase();
  if (lower.includes(`relation "${relation}" does not exist`)) return true;
  if (lower.includes(`table 'public.${relation}'`) && lower.includes("schema cache")) return true;
  if (code.toUpperCase().startsWith("PGRST") && lower.includes(relation) && lower.includes("schema cache")) return true;
  return false;
}

export async function loadBusinessMetrics(
  admin: SupabaseClient,
  sinceIso: string
): Promise<{ rows: TenantBusinessMetrics[]; totalTenants: number }> {
  const tenantsQ = await admin.from("tenants").select("id,slug,name");
  if (tenantsQ.error) throw new Error(tenantsQ.error.message);

  const membersQ = await admin.from("tenant_members").select("tenant_id,status,user_id");
  if (membersQ.error) throw new Error(membersQ.error.message);

  const casesQ = await admin
    .from("cases")
    .select("tenant_id,type,created_at")
    .gte("created_at", sinceIso);
  if (casesQ.error) throw new Error(casesQ.error.message);

  const eventsQ = await admin
    .from("product_events")
    .select("tenant_id,occurred_at")
    .gte("occurred_at", sinceIso);
  const eventsRows = eventsQ.error && isMissingRelation(eventsQ.error, "product_events") ? [] : (eventsQ.data ?? []);
  if (eventsQ.error && !isMissingRelation(eventsQ.error, "product_events")) throw new Error(eventsQ.error.message);

  const gdprQ = await admin
    .from("gdpr_requests")
    .select("tenant_id,request_type,created_at")
    .gte("created_at", sinceIso);
  const gdprRows = gdprQ.error && isMissingRelation(gdprQ.error, "gdpr_requests") ? [] : (gdprQ.data ?? []);
  if (gdprQ.error && !isMissingRelation(gdprQ.error, "gdpr_requests")) throw new Error(gdprQ.error.message);

  const tenants = (tenantsQ.data ?? []) as Array<{ id: string; slug: string; name: string }>;
  const members = (membersQ.data ?? []) as Array<{ tenant_id: string; status: string; user_id: string }>;
  const cases = (casesQ.data ?? []) as Array<{ tenant_id: string | null; type: string; created_at: string }>;
  const events = eventsRows as Array<{ tenant_id: string | null; occurred_at: string }>;
  const gdpr = gdprRows as Array<{ tenant_id: string | null; request_type: string; created_at: string }>;

  const rows: TenantBusinessMetrics[] = tenants.map((t) => {
    const tMembers = members.filter((m) => m.tenant_id === t.id);
    const tCases = cases.filter((c) => c.tenant_id === t.id);
    const tEvents = events.filter((e) => e.tenant_id === t.id);
    const tGdpr = gdpr.filter((g) => g.tenant_id === t.id);

    return {
      tenantId: t.id,
      slug: t.slug,
      name: t.name,
      members: tMembers.length,
      activeMembers: tMembers.filter((m) => m.status === "active").length,
      newCases30d: tCases.length,
      taxesCases30d: tCases.filter((c) => c.type === "taxes").length,
      leadgenCases30d: tCases.filter((c) => c.type === "mortgage" || c.type === "credit" || c.type === "insurance").length,
      productEvents30d: tEvents.length,
      gdprExports30d: tGdpr.filter((g) => g.request_type === "export").length,
      gdprDeletes30d: tGdpr.filter((g) => g.request_type === "delete").length,
    };
  });

  return { rows, totalTenants: tenants.length };
}
