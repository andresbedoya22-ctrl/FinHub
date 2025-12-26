import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

export type UserRole = "user" | "admin";

export async function getMyRole(): Promise<UserRole> {
  const supabase = createSupabaseBrowserClient();

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return "user";

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", uid)
    .maybeSingle();

  if (error) return "user";
  const role = (data?.role ?? "user") as UserRole;
  return role === "admin" ? "admin" : "user";
}