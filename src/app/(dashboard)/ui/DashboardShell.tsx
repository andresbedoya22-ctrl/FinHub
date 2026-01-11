"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getDashboardRouteMeta, type Breadcrumb } from "./dashboardRouteMeta";

type NavItem = {
  href: string;
  label: string;
  section: "FINANZAS" | "OPERACION" | "CUENTA" | "ADMIN";
  icon: "finances" | "transactions" | "documents" | "cases" | "profile" | "admin";
};

type CmdkAction =
  | { id: string; label: string; kind: "nav"; href: string }
  | { id: string; label: string; kind: "createTx"; href: string }
  | { id: string; label: string; kind: "logout" };

const SIDEBAR_KEY = "finhub.dashboard.sidebar.collapsed";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  if (href === "/app/finances") return pathname === "/app/finances" || pathname.startsWith("/app/finances/");
  return pathname === href || pathname.startsWith(href + "/");
}

function Icon({ name, className }: { name: NavItem["icon"]; className?: string }) {
  const common = "w-4 h-4";
  const cls = cx(common, className);

  switch (name) {
    case "finances":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 19V5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path
            d="M7 16l3-4 3 3 4-6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M19 9h2v10h-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "transactions":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 7h13l-2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 17H4l2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 7v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M4 17v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "documents":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M14 3v4a2 2 0 0 0 2 2h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8 13h8M8 17h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "cases":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M6 4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "profile":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "admin":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9.5 12l1.8 1.8L15.8 9.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

function SectionLabel({ children, collapsed }: { children: string; collapsed: boolean }) {
  if (collapsed) return null;
  return <div className="px-3 pt-4 pb-2 text-[11px] tracking-wider text-white/50">{children}</div>;
}

function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  if (!items?.length) return null;
  return (
    <div className="text-xs text-white/60 truncate">
      {items.map((b, idx) => (
        <span key={b.href} className="truncate">
          {idx > 0 && <span className="px-2 text-white/30">/</span>}
          <Link href={b.href} className="hover:text-white/80">
            {b.label}
          </Link>
        </span>
      ))}
    </div>
  );
}

async function doLogout(router: ReturnType<typeof useRouter>) {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    router.push("/login");
  }
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();

  const month = sp.get("month") ?? new Date().toISOString().slice(0, 7);

  // Persistencia de collapsed SIN setState dentro de useEffect (rule del repo)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [accountOpen, setAccountOpen] = useState(false);

  // CmdK
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [cmdkQ, setCmdkQ] = useState("");
  const [cmdkIdx, setCmdkIdx] = useState(0);
  const cmdkInputRef = useRef<HTMLInputElement | null>(null);

  const meta = useMemo(() => getDashboardRouteMeta(pathname), [pathname]);

  const nav: NavItem[] = useMemo(
    () => [
      { href: "/app/finances", label: "Finanzas", section: "FINANZAS", icon: "finances" },
      { href: "/app/finances/transactions", label: "Transacciones", section: "FINANZAS", icon: "transactions" },

      { href: "/app/documents", label: "Documentos", section: "OPERACION", icon: "documents" },
      { href: "/app/cases", label: "Casos", section: "OPERACION", icon: "cases" },

      { href: "/app/profile", label: "Perfil", section: "CUENTA", icon: "profile" },

      { href: "/app/admin", label: "Admin", section: "ADMIN", icon: "admin" },
    ],
    [],
  );

  // Persist collapsed (solo side-effect externo, sin setState)
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  const actions: CmdkAction[] = useMemo(
    () => [
      { id: "go-finances", label: "Ir a Finanzas", kind: "nav", href: "/app/finances" },
      { id: "go-tx", label: "Ir a Transacciones", kind: "nav", href: "/app/finances/transactions" },
      { id: "new-tx", label: "Nueva transacción", kind: "createTx", href: `/app/finances/transactions/new?month=${encodeURIComponent(month)}` },
      { id: "go-docs", label: "Ir a Documentos", kind: "nav", href: "/app/documents" },
      { id: "go-cases", label: "Ir a Casos", kind: "nav", href: "/app/cases" },
      { id: "go-profile", label: "Ir a Perfil", kind: "nav", href: "/app/profile" },
      { id: "go-admin", label: "Ir a Admin", kind: "nav", href: "/app/admin" },
      { id: "logout", label: "Cerrar sesión", kind: "logout" },
    ],
    [month],
  );

  const filteredActions = useMemo(() => {
    const q = cmdkQ.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [actions, cmdkQ]);

  const maxIdx = Math.max(0, filteredActions.length - 1);
  const activeIdx = Math.min(cmdkIdx, maxIdx);

  const openCmdk = () => {
    setAccountOpen(false);
    setCmdkQ("");
    setCmdkIdx(0);
    setCmdkOpen(true);
  };

  const closeCmdk = () => setCmdkOpen(false);

  // Cmd/Ctrl+K (setState ocurre en handler del evento, no en body del effect)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault();
        openCmdk();
        return;
      }
      if (e.key === "Escape") {
        closeCmdk();
        setAccountOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // Focus input (sin setState dentro del effect)
  useEffect(() => {
    if (!cmdkOpen) return;
    const t = window.setTimeout(() => cmdkInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [cmdkOpen]);

  const runAction = async (a: CmdkAction) => {
    closeCmdk();
    if (a.kind === "logout") {
      await doLogout(router);
      return;
    }
    router.push(a.href);
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
            collapsed ? "w-[76px]" : "w-[280px]",
          )}
        >
          <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
            <Link href="/app/finances" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-emerald-500/90" />
              {!collapsed && <div className="font-semibold tracking-wide">FinHub</div>}
            </Link>

            <button
              className="h-9 w-9 rounded-md border border-white/10 hover:bg-white/10 flex items-center justify-center"
              onClick={() => setCollapsed((v) => !v)}
              aria-label="Toggle sidebar"
              type="button"
            >
              <svg className={cx("w-4 h-4 transition-transform", collapsed && "rotate-180")} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <nav className="pb-3">
            <SectionLabel collapsed={collapsed}>FINANZAS</SectionLabel>
            {nav.filter((n) => n.section === "FINANZAS").map((it) => {
              const active = isActive(pathname, it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  title={collapsed ? it.label : undefined}
                  className={cx(
                    "mx-2 my-1 relative flex items-center gap-3 rounded-md px-3 py-2 text-sm border",
                    active ? "bg-white/10 border-white/15" : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10",
                  )}
                >
                  <span className={cx("absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r", active ? "bg-emerald-400" : "bg-transparent")} />
                  <span className="w-8 flex items-center justify-center text-white/85">
                    <Icon name={it.icon} />
                  </span>
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </Link>
              );
            })}

            <SectionLabel collapsed={collapsed}>OPERACIÓN</SectionLabel>
            {nav.filter((n) => n.section === "OPERACION").map((it) => {
              const active = isActive(pathname, it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  title={collapsed ? it.label : undefined}
                  className={cx(
                    "mx-2 my-1 relative flex items-center gap-3 rounded-md px-3 py-2 text-sm border",
                    active ? "bg-white/10 border-white/15" : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10",
                  )}
                >
                  <span className={cx("absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r", active ? "bg-emerald-400" : "bg-transparent")} />
                  <span className="w-8 flex items-center justify-center text-white/85">
                    <Icon name={it.icon} />
                  </span>
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </Link>
              );
            })}

            <SectionLabel collapsed={collapsed}>CUENTA</SectionLabel>
            {nav.filter((n) => n.section === "CUENTA").map((it) => {
              const active = isActive(pathname, it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  title={collapsed ? it.label : undefined}
                  className={cx(
                    "mx-2 my-1 relative flex items-center gap-3 rounded-md px-3 py-2 text-sm border",
                    active ? "bg-white/10 border-white/15" : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10",
                  )}
                >
                  <span className={cx("absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r", active ? "bg-emerald-400" : "bg-transparent")} />
                  <span className="w-8 flex items-center justify-center text-white/85">
                    <Icon name={it.icon} />
                  </span>
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </Link>
              );
            })}

            <SectionLabel collapsed={collapsed}>ADMIN</SectionLabel>
            {nav.filter((n) => n.section === "ADMIN").map((it) => {
              const active = isActive(pathname, it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  title={collapsed ? it.label : undefined}
                  className={cx(
                    "mx-2 my-1 relative flex items-center gap-3 rounded-md px-3 py-2 text-sm border",
                    active ? "bg-white/10 border-white/15" : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10",
                  )}
                >
                  <span className={cx("absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r", active ? "bg-emerald-400" : "bg-transparent")} />
                  <span className="w-8 flex items-center justify-center text-white/85">
                    <Icon name={it.icon} />
                  </span>
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </Link>
              );
            })}

            <div className={cx("mt-4 px-3 text-xs text-white/50", collapsed && "hidden")}>
              Sidebar P0: secciones + iconos + persistencia
            </div>
          </nav>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-10 h-14 border-b border-white/10 bg-white/5 backdrop-blur">
            <div className="h-full px-4 flex items-center gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{meta.title}</div>
                <Breadcrumbs items={meta.breadcrumbs} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="max-w-[720px]">
                  <button
                    className="w-full h-9 rounded-md bg-black/20 border border-white/10 px-3 text-sm text-left text-white/70 hover:border-white/20"
                    type="button"
                    onClick={openCmdk}
                    aria-label="Abrir Command Palette"
                  >
                    Buscar… <span className="ml-2 text-white/35">Cmd/Ctrl+K</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="h-9 px-3 rounded-md border border-white/10 bg-black/20 text-sm hover:bg-white/5"
                  type="button"
                  aria-label="Idioma"
                >
                  EN
                </button>

                <div className="relative">
                  <button
                    className="h-9 px-3 rounded-md border border-white/10 bg-black/20 hover:bg-white/5 flex items-center gap-2"
                    type="button"
                    aria-label="Cuenta"
                    onClick={() => setAccountOpen((v) => !v)}
                  >
                    <span className="w-6 h-6 rounded-full bg-white/15" />
                    <span className="text-sm opacity-80 hidden md:inline">Cuenta</span>
                    <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {accountOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-md border border-white/10 bg-[#0B1220] shadow-lg overflow-hidden">
                      <Link
                        href="/app/profile"
                        className="block px-3 py-2 text-sm hover:bg-white/5"
                        onClick={() => setAccountOpen(false)}
                      >
                        Perfil
                      </Link>
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 text-white/90"
                        type="button"
                        onClick={async () => {
                          setAccountOpen(false);
                          await doLogout(router);
                        }}
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main id="content" className="p-6">
            {children}
          </main>
        </div>
      </div>

      {/* CmdK modal */}
      {cmdkOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24"
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
          onMouseDown={closeCmdk}
        >
          <div
            className="w-[720px] max-w-[92vw] rounded-xl border border-white/10 bg-[#0B1220] shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-white/10">
              <input
                ref={cmdkInputRef}
                value={cmdkQ}
                onChange={(e) => {
                  setCmdkQ(e.target.value);
                  setCmdkIdx(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCmdkIdx((v) => Math.min(v + 1, maxIdx));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCmdkIdx((v) => Math.max(v - 1, 0));
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const a = filteredActions[activeIdx];
                    if (a) void runAction(a);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    closeCmdk();
                  }
                }}
                className="w-full h-10 rounded-md bg-black/20 border border-white/10 px-3 text-sm outline-none focus:border-white/25"
                placeholder="Escribe para buscar acciones…"
                aria-label="Buscar acciones"
              />
            </div>

            <div className="max-h-[360px] overflow-auto">
              {filteredActions.length === 0 ? (
                <div className="p-4 text-sm text-white/60">Sin resultados.</div>
              ) : (
                filteredActions.map((a, idx) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => void runAction(a)}
                    className={cx(
                      "w-full text-left px-3 py-3 text-sm flex items-center justify-between",
                      idx === activeIdx ? "bg-white/10" : "hover:bg-white/5",
                    )}
                  >
                    <span className="text-white/90">{a.label}</span>
                    <span className="text-xs text-white/40">{a.kind === "logout" ? "Auth" : "Nav"}</span>
                  </button>
                ))
              )}
            </div>

            <div className="p-3 border-t border-white/10 text-xs text-white/50 flex justify-between">
              <span>Enter: ejecutar · ↑/↓: navegar · Esc: cerrar</span>
              <span>Cmd/Ctrl+K</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}