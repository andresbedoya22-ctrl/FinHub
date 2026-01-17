"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

async function assertAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!userData.user) throw new Error("No authenticated user");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileErr) throw new Error(profileErr.message);
  if (profile?.role !== "admin") throw new Error("Not authorized");

  return { supabase, userId: userData.user.id };
}

export async function updateSubsidyStatus(args: { applicationId: string; status: string }) {
  const { supabase, userId } = await assertAdmin();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("subsidies_applications")
    .update({ status: args.status, updated_at: now })
    .eq("id", args.applicationId);

  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    actor_user_id: userId,
    action: "admin_action.subsidies.status",
    payload: { applicationId: args.applicationId, status: args.status },
    created_at: now,
  });
}

export async function addSubsidyAdminNote(args: { applicationId: string; message: string }) {
  const { supabase, userId } = await assertAdmin();
  const now = new Date().toISOString();

  const { error } = await supabase.from("subsidies_admin_notes").insert({
    application_id: args.applicationId,
    author_user_id: userId,
    message: args.message.trim(),
    created_at: now,
  });
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    actor_user_id: userId,
    action: "admin_action.subsidies.note",
    payload: { applicationId: args.applicationId },
    created_at: now,
  });
}

export async function requestSubsidyMissingDocs(args: {
  applicationId: string;
  docKeys: string[];
  message: string;
}) {
  const { supabase, userId } = await assertAdmin();
  const now = new Date().toISOString();

  if (args.docKeys.length > 0) {
    const { error } = await supabase
      .from("subsidies_documents")
      .update({ status: "missing", notes: args.message, updated_at: now })
      .eq("application_id", args.applicationId)
      .in("doc_key", args.docKeys);
    if (error) throw new Error(error.message);
  }

  if (args.message.trim()) {
    const { error } = await supabase.from("subsidies_admin_notes").insert({
      application_id: args.applicationId,
      author_user_id: userId,
      message: args.message.trim(),
      created_at: now,
    });
    if (error) throw new Error(error.message);
  }

  await supabase.from("audit_log").insert({
    actor_user_id: userId,
    action: "admin_action.subsidies.request_docs",
    payload: { applicationId: args.applicationId, docKeys: args.docKeys },
    created_at: now,
  });
}
