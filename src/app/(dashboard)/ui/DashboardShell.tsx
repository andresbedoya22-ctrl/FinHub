"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import CommandPalette from "./CommandPalette";
import { DASHBOARD_NAV, getHeaderMeta, isActivePath } from "./dashboardNav";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const header = useMemo(() => getHeaderMeta(pathname), [pathname]);

  return (
    <div className="min-h-dvh bg-[#0B1220] text-white">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:px-3 focus:py-2 focus:rounded-md focus:bg-white focus:text-black"
      >
        Saltar al contenido
      </a>

      <CommandPalette items={DASHBOARD_NAV} />

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cx(
            "sticky top-0 h-dvh border-r border-white/10 bg-white/5 backdrop-blur",
            collapsed ? "w-[72px]" : "w-[260px]",
          )}
        >
          <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
            <Link href="/app/finances" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-emerald-500/90" />
              {!collapsed && <div className="font-semibold tracking-wide">FinHub</div>}
            </Link>

            <button
              className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/10"
              onClick={() => setCollapsed((v) => !v)}
              aria-label="Toggle sidebar"
              type="button"
            >
              {collapsed ? "»" : "«"}
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {DASHBOARD_NAV.map((it) => {
              const active = isActivePath(pathname, it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cx(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm border",
                    active
                      ? "bg-white/10 border-white/15"
                      : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10",
                  )}
                  title={collapsed ? it.label : undefined}
                >
                  <span className={cx("inline-block w-2 h-2 rounded-full", active ? "bg-emerald-400" : "bg-white/30")} />
                  {!collapsed && <span>{it.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
            <div className={cx("text-xs opacity-70", collapsed && "hidden")}>
              Tip: Cmd/Ctrl+K
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-10 h-14 border-b border-white/10 bg-white/5 backdrop-blur">
            <div className="h-full px-4 flex items-center gap-3">
              <div className="min-w-0">
                <div className="font-medium leading-tight truncate">{header.title}</div>
                {header.subtitle && <div className="text-xs opacity-70 leading-tight truncate">{header.subtitle}</div>}
              </div>

              <div className="flex-1 min-w-0">
                <div className="max-w-[720px]">
                  <input
                    className="w-full h-9 rounded-md bg-black/20 border border-white/10 px-3 text-sm outline-none focus:border-white/25"
                    placeholder="Buscar… (Cmd/Ctrl+K)"
                    aria-label="Buscar"
                    readOnly
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="h-9 px-3 rounded-md border border-white/10 bg-black/20 text-sm hover:bg-white/5"
                  type="button"
                  aria-label="Idioma"
                  title="Locale (P0 UI)"
                >
                  EN
                </button>

                <button
                  className="h-9 w-9 rounded-md border border-white/10 bg-black/20 hover:bg-white/5"
                  type="button"
                  aria-label="Notificaciones"
                  title="Notificaciones (P0 UI)"
                >
                  <span className="text-sm">🔔</span>
                </button>

                <button
                  className="h-9 px-3 rounded-md border border-white/10 bg-black/20 hover:bg-white/5 flex items-center gap-2"
                  type="button"
                  aria-label="Usuario"
                  title="Cuenta (P0 UI)"
                >
                  <span className="w-6 h-6 rounded-full bg-white/20" />
                  <span className="text-sm opacity-80">Cuenta</span>
                </button>
              </div>
            </div>
          </header>

          <main id="content" className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}