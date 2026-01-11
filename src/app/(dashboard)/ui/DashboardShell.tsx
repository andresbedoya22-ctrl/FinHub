"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { getRouteMeta } from "./dashboardRouteMeta";

type NavItem = { href: string; label: string };

type Command = {
  id: string;
  label: string;
  keywords: string[];
  run: () => void;
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  if (href === "/app/finances") return pathname === "/app/finances" || pathname.startsWith("/app/finances/");
  return pathname === href || pathname.startsWith(href + "/");
}

function norm(s: string) {
  return s.toLowerCase().trim();
}

function matchCmd(q: string, cmd: Command) {
  const qq = norm(q);
  if (!qq) return true;
  const hay = [cmd.label, ...cmd.keywords].map(norm).join(" ");
  return hay.includes(qq);
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const meta = useMemo(() => getRouteMeta(pathname || "/app"), [pathname]);

  const [collapsed, setCollapsed] = useState(false);

  // CmdK palette
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [cmdkQuery, setCmdkQuery] = useState("");
  const [cmdkIdx, setCmdkIdx] = useState(0);

  const nav: NavItem[] = useMemo(
    () => [
      { href: "/app/finances", label: "Finanzas" },
      { href: "/app/finances/transactions", label: "Transacciones" },
      { href: "/app/documents", label: "Documentos" },
      { href: "/app/cases", label: "Casos" },
      { href: "/app/profile", label: "Perfil" },
      { href: "/app/admin", label: "Admin" },
    ],
    [],
  );

  const commands: Command[] = useMemo(() => {
    const go = (href: string) => () => {
      setCmdkOpen(false);
      setCmdkQuery("");
      setCmdkIdx(0);
      router.push(href);
    };

    const logout = async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
      } finally {
        setCmdkOpen(false);
        setCmdkQuery("");
        setCmdkIdx(0);
        router.push("/login");
        router.refresh();
      }
    };

    return [
      { id: "go-finances", label: "Ir a Finanzas", keywords: ["finances", "dashboard", "home"], run: go("/app/finances") },
      {
        id: "go-transactions",
        label: "Ir a Transacciones",
        keywords: ["transactions", "inbox", "ledger"],
        run: go("/app/finances/transactions"),
      },
      {
        id: "new-transaction",
        label: "Nueva transacción",
        keywords: ["create", "manual", "add transaction"],
        run: go("/app/finances/transactions/new"),
      },
      { id: "go-documents", label: "Ir a Documentos", keywords: ["documents", "ocr"], run: go("/app/documents") },
      { id: "go-cases", label: "Ir a Casos", keywords: ["cases"], run: go("/app/cases") },
      { id: "go-profile", label: "Ir a Perfil", keywords: ["account", "settings"], run: go("/app/profile") },
      { id: "go-admin", label: "Ir a Admin", keywords: ["admin"], run: go("/app/admin") },
      { id: "logout", label: "Cerrar sesión", keywords: ["logout", "sign out"], run: logout },
    ];
  }, [router]);

  const visibleCommands = useMemo(() => commands.filter((c) => matchCmd(cmdkQuery, c)), [commands, cmdkQuery]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      const mod = e.metaKey || e.ctrlKey;

      if (mod && isK) {
        e.preventDefault();
        setCmdkOpen(true);
        setTimeout(() => {
          const el = document.getElementById("cmdk-input") as HTMLInputElement | null;
          el?.focus();
        }, 0);
        return;
      }

      if (!cmdkOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setCmdkOpen(false);
        setCmdkQuery("");
        setCmdkIdx(0);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCmdkIdx((v) => Math.min(v + 1, Math.max(0, visibleCommands.length - 1)));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCmdkIdx((v) => Math.max(0, v - 1));
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = visibleCommands[cmdkIdx];
        cmd?.run();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cmdkOpen, cmdkIdx, visibleCommands]);

  useEffect(() => {
    // Reset índice al cambiar filtro
    setCmdkIdx(0);
  }, [cmdkQuery]);

  const onLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-dvh bg-[#0B1220] text-white">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:px-3 focus:py-2 focus:rounded-md focus:bg-white focus:text-black"
      >
        Saltar al contenido
      </a>

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
            {nav.map((it) => {
              const active = isActive(pathname, it.href);
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
                >
                  <span className={cx("inline-block w-2 h-2 rounded-full", active ? "bg-emerald-400" : "bg-white/30")} />
                  {!collapsed && <span>{it.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
            <div className={cx("text-xs opacity-70", collapsed && "hidden")}>Shell P0: header + sidebar (route-aware + CmdK)</div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-10 h-14 border-b border-white/10 bg-white/5 backdrop-blur">
            <div className="h-full px-4 flex items-center gap-3">
              <div className="min-w-0">
                <div className="text-[11px] opacity-70 truncate">
                  {meta.crumbs.map((c, i) => (
                    <span key={c.label + i}>
                      {c.href ? (
                        <Link href={c.href} className="hover:underline">
                          {c.label}
                        </Link>
                      ) : (
                        <span>{c.label}</span>
                      )}
                      {i < meta.crumbs.length - 1 ? <span className="mx-2 opacity-50">/</span> : null}
                    </span>
                  ))}
                </div>
                <div className="font-medium leading-tight truncate">{meta.title}</div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="max-w-[760px] mx-auto">
                  <button
                    type="button"
                    onClick={() => setCmdkOpen(true)}
                    className="w-full h-9 rounded-md bg-black/20 border border-white/10 px-3 text-sm text-left outline-none hover:border-white/25"
                    aria-label="Abrir Command Palette"
                  >
                    <span className="opacity-80">Buscar o ejecutar…</span>
                    <span className="float-right opacity-60">Ctrl/Cmd + K</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Locale placeholder (P0 UI) */}
                <button
                  className="h-9 px-3 rounded-md border border-white/10 bg-black/20 text-sm hover:bg-white/5"
                  type="button"
                  aria-label="Idioma"
                >
                  EN
                </button>

                {/* Bell placeholder */}
                <button
                  className="h-9 w-9 rounded-md border border-white/10 bg-black/20 hover:bg-white/5"
                  type="button"
                  aria-label="Notificaciones"
                >
                  <span className="text-sm">🔔</span>
                </button>

                {/* Account menu */}
                <details className="relative">
                  <summary className="list-none h-9 px-3 rounded-md border border-white/10 bg-black/20 hover:bg-white/5 flex items-center gap-2 cursor-pointer">
                    <span className="w-6 h-6 rounded-full bg-white/20" />
                    <span className="text-sm opacity-80">Cuenta</span>
                  </summary>

                  <div className="absolute right-0 mt-2 w-56 rounded-md border border-white/10 bg-[#0B1220] shadow-lg overflow-hidden">
                    <Link href="/app/profile" className="block px-3 py-2 text-sm hover:bg-white/5">
                      Perfil
                    </Link>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-white/5"
                      onClick={onLogout}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </details>
              </div>
            </div>
          </header>

          <main id="content" className="p-6">
            {children}
          </main>
        </div>
      </div>

      {/* CmdK Modal */}
      {cmdkOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setCmdkOpen(false);
              setCmdkQuery("");
              setCmdkIdx(0);
            }
          }}
        >
          <div className="w-full max-w-[720px] mt-16 rounded-xl border border-white/10 bg-[#0B1220] overflow-hidden">
            <div className="p-3 border-b border-white/10">
              <input
                id="cmdk-input"
                className="w-full h-10 rounded-md bg-black/20 border border-white/10 px-3 text-sm outline-none focus:border-white/25"
                placeholder="Escribe para buscar… (Enter para ejecutar, Esc para cerrar)"
                value={cmdkQuery}
                onChange={(e) => setCmdkQuery(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="max-h-[360px] overflow-auto">
              {visibleCommands.length === 0 ? (
                <div className="p-4 text-sm opacity-70">Sin resultados.</div>
              ) : (
                <ul className="p-2">
                  {visibleCommands.map((c, i) => {
                    const active = i === cmdkIdx;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => c.run()}
                          className={cx(
                            "w-full text-left px-3 py-2 rounded-md text-sm border",
                            active ? "bg-white/10 border-white/15" : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10",
                          )}
                        >
                          {c.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="px-3 py-2 border-t border-white/10 text-xs opacity-60 flex justify-between">
              <span>↑/↓ navegar</span>
              <span>Enter ejecutar</span>
              <span>Esc cerrar</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}