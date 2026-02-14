import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

import { AppProviders } from "./providers";
import FinnyWidget from "@/features/assistant/finny/ui/FinnyWidget";
import { getI18nRequestContext } from "@/i18n/request";
import { DevHydrationProbe } from "../ui/DevHydrationProbe";

async function createSupabaseServerClientReadOnly() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = await cookies();

  if (!url || !anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // En Server Components, setAll no debe mutar cookies; el refresh lo hace el proxy.
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // no-op
      },
    },
  });
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClientReadOnly();
  const { data } = await supabase.auth.getUser();
  const { locale, timeZone } = await getI18nRequestContext();

  if (!data.user) redirect("/login");

  return (
    <AppProviders>
      <DevHydrationProbe ssrLocale={locale} ssrTimeZone={timeZone} />
      {children}
      <FinnyWidget />
    </AppProviders>
  );
}
