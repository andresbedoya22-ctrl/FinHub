import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

import { AppProviders } from "./providers";
import { AppShell } from "@/ui/components/AppShell";
import FinnyWidget from "@/features/assistant/finny/ui/FinnyWidget";

type Profile = { role: "user" | "admin" };

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

async function logoutAction() {
  "use server";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = await cookies();

  if (!url || !anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.signOut();
  redirect("/login");
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClientReadOnly();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const isAdmin = (profile as Profile | null)?.role === "admin";

  const navItems = [
    { href: "/app/finances", label: "Finanzas" },
    { href: "/app/cases", label: "Casos" },
    { href: "/app/documents", label: "Documentos" },
    { href: "/app/profile", label: "Perfil" },
    { href: "/app/ui-kit", label: "UI Kit" },
    ...(isAdmin ? [{ href: "/app/admin", label: "Admin" }] : []),
  ];

  return (
    <AppShell
      navItems={navItems}
      isAdmin={isAdmin}
      logoutSlot={
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            Logout
          </button>
        </form>
      }
    >
      <AppProviders>
        {children}
        <FinnyWidget />
      </AppProviders>
    </AppShell>
  );
}

