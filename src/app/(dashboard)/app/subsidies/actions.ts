"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import type { EligibilityResult, SubsidyStatus, SubsidySlug } from "@/domain/subsidies/types";
import { isSubsidySlug } from "@/domain/subsidies/registry";

export async function createSubsidyApplication(args: {
  slug: SubsidySlug;
  eligibilitySnapshot: EligibilityResult;
  intakeData: Record<string, unknown>;
  status?: SubsidyStatus;
}): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!userData.user) throw new Error("No authenticated user");
  if (!isSubsidySlug(args.slug)) throw new Error("Invalid subsidy slug");

  const now = new Date().toISOString();
  const status = args.status ?? "eligible_checked";

  const { data, error } = await supabase
    .from("subsidies_applications")
    .insert({
      user_id: userData.user.id,
      slug: args.slug,
      status,
      eligibility_snapshot: args.eligibilitySnapshot,
      intake_data: args.intakeData,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}
