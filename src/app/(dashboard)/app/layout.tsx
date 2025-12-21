import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppProviders } from "./providers";

const navItems = [
  { href: "/app", label: "Inicio" },
  { href: "/app/cases", label: "Casos" },
  { href: "/app/documents", label: "Documentos" },
  { href: "/app/profile", label: "Perfil" },
  { href: "/app/ui-kit", label: "UI Kit" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
    >
      {label}
    </Link>
  );
}

async function logoutAction() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.set("fh_session", "", { path: "/", maxAge: 0 });
  redirect("/login");
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("fh_session")?.value;

  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-fh-bg">
      <header className="sticky top-0 z-10 border-b border-fh-border bg-fh-bg/90 backdrop-blur">
        <div className="fh-container flex items-center justify-between gap-4">
          <Link href="/app" className="text-sm font-semibold tracking-tight">
            FinHub
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((it) => (
              <NavLink key={it.href} href={it.href} label={it.label} />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="md:hidden flex items-center gap-2">
              <NavLink href="/app/profile" label="Perfil" />
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
              >
                Logout
              </button>
            </form>
          </div>
        </div>

        <div className="md:hidden border-t border-fh-border">
          <div className="fh-container flex items-center gap-2 overflow-x-auto py-3">
            {navItems.map((it) => (
              <NavLink key={it.href} href={it.href} label={it.label} />
            ))}
          </div>
        </div>
      </header>

      <div className="fh-container py-6">
        <AppProviders>{children}</AppProviders>
      </div>
    </div>
  );
}
