"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { getDashboardRouteMeta, type Breadcrumb } from "./dashboardRouteMeta";
import { LanguageSwitcher } from "@/ui/components/LanguageSwitcher";
import { ThemeToggle, type ThemeMode } from "@/ui/components/ThemeToggle";
import { Button } from "@/ui/components/Button";
import { Sheet } from "@/ui/components/Sheet";
import { getMyRole, type UserRole } from "@/features/auth/roleClient";

type NavItem = { href: string; label: string };
type NavSection = { title: string; items: NavItem[] };

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app" || pathname === "/app/finances";
  if (href === "/app/finances") return pathname === "/app/finances" || pathname.startsWith("/app/finances/");
  return pathname === href || pathname.startsWith(href + "/");
}

function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-fh-muted">
      {items.map((b, idx) => (
        <div key={b.href + b.label} className="flex min-w-0 items-center gap-2">
          {idx > 0 && <span>/</span>}
          <Link href={b.href} className="truncate hover:text-fh-text">
            {b.label}
          </Link>
        </div>
      ))}
    </div>
  );
}

function SidebarSection({ pathname, section, onNavigate }: { pathname: string; section: NavSection; onNavigate?: () => void }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-fh-border bg-fh-surface-2/40">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-fh-muted"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{section.title}</span>
        <span>{open ? "-" : "+"}</span>
      </button>
      {open ? (
        <div className="space-y-1 p-2 pt-0">
          {section.items.map((it) => {
            const active = isActive(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNavigate}
                className={cx(
                  "block rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "border border-fh-primary/30 bg-fh-primary/15 text-fh-text"
                    : "border border-transparent text-fh-muted hover:border-fh-border hover:bg-fh-surface"
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SidebarNav({ pathname, sections, onNavigate }: { pathname: string; sections: NavSection[]; onNavigate?: () => void }) {
  return (
    <nav className="space-y-3">
      {sections.map((section) => (
        <SidebarSection key={section.title} pathname={pathname} section={section} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

export default function DashboardShell({ children, initialTheme }: { children: ReactNode; initialTheme: ThemeMode }) {
  const pathname = usePathname();
  const router = useRouter();
  const shellT = useTranslations("shell");
  const subsT = useTranslations("subsidies");

  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<UserRole>("user");

  useEffect(() => {
    let alive = true;
    void getMyRole().then((nextRole) => {
      if (alive) setRole(nextRole);
    });
    return () => {
      alive = false;
    };
  }, []);

  const meta = useMemo(() => getDashboardRouteMeta(pathname, shellT, subsT), [pathname, shellT, subsT]);

  const sections = useMemo<NavSection[]>(() => {
    const out: NavSection[] = [
      {
        title: shellT("section.home"),
        items: [{ href: "/app", label: shellT("nav.home") }],
      },
      {
        title: shellT("section.finances"),
        items: [
          { href: "/app/finances", label: shellT("nav.overview") },
          { href: "/app/finances/transactions", label: shellT("nav.transactions") },
        ],
      },
      {
        title: shellT("section.taxes"),
        items: [{ href: "/app/taxes", label: shellT("nav.taxes") }],
      },
      {
        title: shellT("section.subsidies"),
        items: [{ href: "/app/subsidies", label: shellT("nav.subsidies") }],
      },
      {
        title: shellT("section.leadgen"),
        items: [
          { href: "/app/mortgage", label: shellT("nav.mortgage") },
          { href: "/app/credit", label: shellT("nav.credit") },
          { href: "/app/insurance", label: shellT("nav.insurance") },
        ],
      },
      {
        title: shellT("section.operations"),
        items: [
          { href: "/app/cases", label: shellT("nav.cases") },
          { href: "/app/documents", label: shellT("nav.documents") },
        ],
      },
      {
        title: shellT("section.account"),
        items: [{ href: "/app/profile", label: shellT("nav.profile") }],
      },
    ];

    if (role === "admin") {
      out.push({ title: shellT("section.admin"), items: [{ href: "/app/admin", label: shellT("nav.admin") }] });
    }

    if (process.env.NODE_ENV !== "production") {
      out.push({ title: shellT("section.dev"), items: [{ href: "/app/ui-kit", label: shellT("nav.uikit") }] });
    }

    return out;
  }, [role, shellT]);

  return (
    <div className="h-dvh overflow-hidden bg-fh-bg text-fh-text">
      <aside className="fixed inset-y-0 left-0 hidden w-[300px] border-r border-fh-border bg-fh-surface/85 p-3 lg:block">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-fh-border bg-fh-surface-2 p-3">
          <Link href="/app" className="text-lg font-semibold tracking-tight">
            {shellT("brand")}
          </Link>
          <span className="text-xs text-fh-muted">{shellT("version")}</span>
        </div>
        <div className="h-[calc(100dvh-5.75rem)] overflow-y-auto pr-1">
          <SidebarNav pathname={pathname} sections={sections} />
        </div>
      </aside>

      <div className="flex h-full min-w-0 flex-col lg:pl-[300px]">
        <header className="z-20 shrink-0 border-b border-fh-border bg-fh-bg/95 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
            <Button type="button" variant="secondary" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label={shellT("sidebar.open")}>{shellT("sidebar.menu")}</Button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{meta.title}</div>
              <Breadcrumbs items={meta.breadcrumbs} />
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle
                initialTheme={initialTheme}
                label={shellT("theme.toggle")}
                darkLabel={shellT("theme.dark")}
                lightLabel={shellT("theme.light")}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void fetch("/api/auth/logout", { method: "POST" }).finally(() => router.push("/login"));
                }}
              >
                {shellT("account.logout")}
              </Button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <main id="content" className="p-4 lg:p-6">
            {children}
          </main>

          <footer className="border-t border-fh-border px-4 py-4 text-xs text-fh-muted lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{shellT("brand")}</span>
              <div className="flex items-center gap-3">
                <Link href="/privacy" className="hover:text-fh-text">{shellT("footer.privacy")}</Link>
                <Link href="/terms" className="hover:text-fh-text">{shellT("footer.terms")}</Link>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} title={shellT("sidebar.mobileTitle")}>
        <SidebarNav pathname={pathname} sections={sections} onNavigate={() => setMobileOpen(false)} />
      </Sheet>
    </div>
  );
}
