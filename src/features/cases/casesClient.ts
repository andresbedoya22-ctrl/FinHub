import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

export type CaseRow = {
  id: string;
  user_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function listMyCases() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("cases")
    .select("id,user_id,title,status,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CaseRow[];
}

export async function createCase(title: string) {
  const supabase = createSupabaseBrowserClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  const userId = userData.user?.id;
  if (!userId) throw new Error("No authenticated user");

  const { data, error } = await supabase
    .from("cases")
    .insert({ title, user_id: userId })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
