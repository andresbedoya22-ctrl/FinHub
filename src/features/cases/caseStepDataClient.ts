import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type CaseStepDataRow = {
  id: string;
  case_id: string;
  step_key: string;
  data: unknown;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getStepData(caseId: string, stepKey: string) {
  const supabase = createSupabaseBrowserClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("case_step_data")
    .select("id,case_id,step_key,data,completed_at,created_at,updated_at")
    .eq("case_id", caseId)
    .eq("step_key", stepKey)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as CaseStepDataRow | null;
}

export async function upsertStepData(caseId: string, stepKey: string, payload: unknown) {
  const supabase = createSupabaseBrowserClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!userData.user) throw new Error("No authenticated user");

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("case_step_data")
    .upsert(
      {
        case_id: caseId,
        step_key: stepKey,
        data: payload,
        updated_at: now,
      },
      { onConflict: "case_id,step_key" }
    );

  if (error) throw new Error(error.message);
}

export async function deleteStepData(caseId: string, stepKey: string) {
  const supabase = createSupabaseBrowserClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!userData.user) throw new Error("No authenticated user");

  const { error } = await supabase
    .from("case_step_data")
    .delete()
    .eq("case_id", caseId)
    .eq("step_key", stepKey);

  if (error) throw new Error(error.message);
}
