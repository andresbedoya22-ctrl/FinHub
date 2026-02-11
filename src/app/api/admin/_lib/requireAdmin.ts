import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return { ok: false as const, status: 401, error: "Unauthorized", supabase };
  }

  const { data: isAdminData, error: isAdminError } = await supabase.rpc("is_admin");
  if (isAdminError || !isAdminData) {
    return { ok: false as const, status: 403, error: "Forbidden", supabase };
  }

  return { ok: true as const, supabase, userId: userData.user.id };
}
