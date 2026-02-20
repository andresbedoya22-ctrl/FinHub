import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { LanguageGate } from "./LanguageGate";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app/finances");
  }

  return <LanguageGate />;
}
