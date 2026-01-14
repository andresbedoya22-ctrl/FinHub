import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import type { SubsidyPolicy2026 } from "@/domain/subsidies/policy";
import { DEFAULT_POLICY_2026 } from "@/domain/subsidies/policy";

export async function getSubsidyPolicy2026(): Promise<SubsidyPolicy2026> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subsidies_policy")
    .select("payload")
    .eq("year", 2026)
    .maybeSingle();

  if (error || !data?.payload) return DEFAULT_POLICY_2026;
  return data.payload as SubsidyPolicy2026;
}
