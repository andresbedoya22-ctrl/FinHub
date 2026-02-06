"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { LanguageSwitcher } from "@/ui/components/LanguageSwitcher";
import { CommandPalette, type CommandAction } from "@/ui/components/CommandPalette";
import { useCases } from "@/features/cases/casesStore";
import type { CaseType } from "@/features/cases/casesTypes";
import { defaultTitleForCaseType } from "@/features/cases/casesConfig";

type NavItem = { href: string; label: string };

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function displayLabelForCaseType(type: CaseType): string {
  switch (type) {
    case "toeslagen":
      return "Toeslagen";
    case "taxes":
      return "Taxes";
    case "mortgage":
      return "Mortgage";
    case "credit":
      return "Credit";
    case "insurance":
      return "Insurance";
    default:
      return type;
  }
}

const CASE_TYPES: CaseType[] = ["toeslagen", "taxes", "mortgage", "credit", "insurance"];

export function AppShell({
  navItems,
  isAdmin,
  logoutSlot,
  children,
}: {
  navItems: NavItem[];
  isAdmin: boolean;
  logoutSlot: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const createCase = useCases((s) => s.createCase);

  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const actions: CommandAction[] = React.useMemo(() => {
    const nav: CommandAction[] = [
      { id: "nav_finances", label: "Ir a Finanzas", hint: "/app/finances", keywords: ["finanzas", "dashboard"], run: () => router.push("/app/finances") },
      { id: "nav_cases", label: "Ir a Casos", hint: "/app/cases", keywords: ["cases", "casos", "historial"], run: () => router.push("/app/cases") },
      { id: "nav_documents", label: "Ir a Documentos", hint: "/app/documents", keywords: ["docs", "documentos", "ocr"], run: () => router.push("/app/documents") },
      { id: "nav_profile", label: "Ir a Perfil", hint: "/app/profile", keywords: ["profile", "perfil"], run: () => router.push("/app/profile") },
      ...(isAdmin ? [{ id: "nav_admin", label: "Ir a Admin", hint: "/app/admin", keywords: ["admin"], run: () => router.push("/app/admin") }] : []),
    ];

    const create: CommandAction[] = CASE_TYPES.map((t) => ({
      id: `case_${t}`,
      label: `Crear caso: ${displayLabelForCaseType(t)}`,
      hint: defaultTitleForCaseType(t),
      keywords: ["crear", "nuevo", "case", t],
      run: async () => {
        const id = await createCase(t);
        router.push(`/app/cases/${id}`);
      },
    }));

    return [...nav, ...create];
  }, [router, createCase, isAdmin]);

  function NavLink({ href, label }: NavItem) {
    const active = pathname === href || (href !== "/app/finances" && pathname?.startsWith(href));
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={cx(
          "rounded-xl px-3 py-2 text-sm transition",
          active ? "bg-fh-surface-2 text-white" : "text-white/80 hover:bg-white/10"
        )}
      >
        {label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-fh-bg">
      <header className="sticky top-0 z-20 border-b border-fh-border bg-fh-bg/90 backdrop-blur">
        <div className="fh-container flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Abrir navegación"
            >
              Menú
            </button>

            <Link href="/app/finances" className="text-sm font-semibold tracking-tight">
              FinHub
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              Ctrl/Cmd+K
            </button>

            <LanguageSwitcher />

            {logoutSlot}
          </div>
        </div>
      </header>

      <div className="fh-container flex gap-6 py-6">
        <aside className="hidden md:block w-[260px] shrink-0">
          <div className="rounded-2xl border border-fh-border bg-fh-surface p-3">
            <div className="text-xs text-fh-muted mb-2">Navegación</div>
            <nav className="flex flex-col gap-1">
              {navItems.map((it) => (
                <NavLink key={it.href} href={it.href} label={it.label} />
              ))}
            </nav>

            <div className="mt-4 rounded-xl border border-fh-border bg-fh-surface-2 p-3">
              <div className="text-xs text-fh-muted">Acciones</div>
              <button
                className="mt-2 w-full rounded-xl bg-fh-accent px-3 py-2 text-sm font-medium text-white hover:opacity-95"
                onClick={() => setPaletteOpen(true)}
              >
                Crear / Ir a…
              </button>
              <div className="mt-2 text-xs text-fh-muted">Tip: Ctrl/Cmd+K</div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[82vw] max-w-[320px] border-r border-fh-border bg-fh-bg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">FinHub</div>
              <button
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
                onClick={() => setMobileOpen(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4">
              <div className="text-xs text-fh-muted mb-2">Navegación</div>
              <nav className="flex flex-col gap-1">
                {navItems.map((it) => (
                  <NavLink key={it.href} href={it.href} label={it.label} />
                ))}
              </nav>

              <button
                className="mt-4 w-full rounded-xl bg-fh-accent px-3 py-2 text-sm font-medium text-white hover:opacity-95"
                onClick={() => {
                  setMobileOpen(false);
                  setPaletteOpen(true);
                }}
              >
                Crear / Ir a…
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} actions={actions} />
    </div>
  );
}
