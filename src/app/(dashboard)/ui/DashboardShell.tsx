"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { getDashboardRouteMeta, type Breadcrumb } from "./dashboardRouteMeta";
import { LanguageSwitcher } from "@/ui/components/LanguageSwitcher";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  if (href === "/app/finances") return pathname === "/app/finances" || pathname.startsWith("/app/finances/");
  return pathname === href || pathname.startsWith(href + "/");
}

/** Minimal inline icons (no deps) */
function Icon({ name }: { name: "grid" | "money" | "doc" | "case" | "user" | "shield" | "search" | "bell" | "benefit" }) {
  const common = "w-4 h-4";
  switch (name) {
    case "grid":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "money":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 7h18v10H3V7z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 12h.01M17 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M12 10.2c-1.3 0-2.3.7-2.3 1.8 0 2.2 4.6 1.1 4.6 3.3 0 1.1-1 1.8-2.3 1.8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "doc":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 3h7l3 3v15H7V3z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "case":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 8h16v11H4V8z" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M9 8V6.5A2.5 2.5 0 0 1 11.5 4h1A2.5 2.5 0 0 1 15 6.5V8"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M4 12h16" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "user":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "shield":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3l8 4v6c0 5-3.5 8-8 8s-8-3-8-8V7l8-4z" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M9.5 12l1.8 1.8L15 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "benefit":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3l3 3-3 3-3-3 3-3z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 10h14v10H5V10z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "search":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "bell":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 5 2 7H4c0-2 2-2 2-7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
}

type NavItem = { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"] };
type NavSection = { title: string; items: NavItem[] };

type CmdkAction =
  | { id: string; label: string; hint?: string; kind: "nav"; href: string }
  | { id: string; label: string; hint?: string; kind: "logout" };

function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-0.5 flex items-center gap-2 text-xs text-white/60 min-w-0">
      {items.map((b, idx) => (
        <div key={b.href + b.label} className="flex items-center gap-2 min-w-0">
          {idx > 0 && <span className="opacity-60">/</span>}
          <Link href={b.href} className="hover:text-white/80 truncate">
            {b.label}
          </Link>
        </div>
      ))}
    </div>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const shellT = useTranslations("shell");
  const subsT = useTranslations("subsidies");

  const SIDEBAR_KEY = "finhub.sidebar.collapsed.v1";

  // Sidebar collapsed: keep initial render deterministic for SSR + hydration
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_KEY);
      if (stored === "1") {
        const id = window.setTimeout(() => setCollapsed(true), 0);
        return () => window.clearTimeout(id);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist collapsed
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  const meta = useMemo(() => getDashboardRouteMeta(pathname, shellT, subsT), [pathname, shellT, subsT]);

  const navSections: NavSection[] = useMemo(
    () => [
      {
        title: shellT("section.finances"),
        items: [
          { href: "/app/finances", label: shellT("nav.overview"), icon: "money" },
          { href: "/app/finances/transactions", label: shellT("nav.transactions"), icon: "grid" },
        ],
      },
      {
        title: shellT("section.subsidies"),
        items: [{ href: "/app/subsidies", label: shellT("nav.subsidies"), icon: "benefit" }],
      },
      {
        title: shellT("section.operations"),
        items: [
          { href: "/app/documents", label: shellT("nav.documents"), icon: "doc" },
          { href: "/app/cases", label: shellT("nav.cases"), icon: "case" },
        ],
      },
      {
        title: shellT("section.account"),
        items: [{ href: "/app/profile", label: shellT("nav.profile"), icon: "user" }],
      },
      {
        title: shellT("section.admin"),
        items: [
          { href: "/app/admin", label: shellT("nav.admin"), icon: "shield" },
          { href: "/app/ui-kit", label: shellT("nav.uikit"), icon: "grid" },
        ],
      },
    ],
    [shellT],
  );

  // CmdK
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [cmdkQ, setCmdkQ] = useState("");
  const [cmdkIdx, setCmdkIdx] = useState(0);
  const cmdkInputRef = useRef<HTMLInputElement | null>(null);

  const openCmdk = useCallback(() => {
    setCmdkQ("");
    setCmdkIdx(0);
    setCmdkOpen(true);
  }, []);

  const closeCmdk = useCallback(() => {
    setCmdkOpen(false);
  }, []);

  const actions: CmdkAction[] = useMemo(
    () => [
      { id: "nav-finances", kind: "nav", href: "/app/finances", label: shellT("cmdk.goToFinances"), hint: "/app/finances" },
      { id: "nav-tx", kind: "nav", href: "/app/finances/transactions", label: shellT("cmdk.goToTransactions"), hint: "/app/finances/transactions" },
      { id: "nav-subsidies", kind: "nav", href: "/app/subsidies", label: shellT("cmdk.goToSubsidies"), hint: "/app/subsidies" },
      { id: "nav-docs", kind: "nav", href: "/app/documents", label: shellT("cmdk.goToDocuments"), hint: "/app/documents" },
      { id: "nav-cases", kind: "nav", href: "/app/cases", label: shellT("cmdk.goToCases"), hint: "/app/cases" },
      { id: "nav-profile", kind: "nav", href: "/app/profile", label: shellT("cmdk.goToProfile"), hint: "/app/profile" },
      { id: "nav-ui-kit", kind: "nav", href: "/app/ui-kit", label: shellT("cmdk.goToUiKit"), hint: "/app/ui-kit" },
      { id: "logout", kind: "logout", label: shellT("account.logout"), hint: shellT("cmdk.logoutHint") },
    ],
    [shellT],
  );

  const filteredActions = useMemo(() => {
    const q = cmdkQ.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => (a.label + " " + (a.hint ?? "")).toLowerCase().includes(q));
  }, [actions, cmdkQ]);

  const boundedIdx = useMemo(() => {
    if (filteredActions.length === 0) return 0;
    if (cmdkIdx < 0) return 0;
    if (cmdkIdx >= filteredActions.length) return filteredActions.length - 1;
    return cmdkIdx;
  }, [cmdkIdx, filteredActions.length]);

  const filteredRef = useRef<CmdkAction[]>([]);
  const idxRef = useRef<number>(0);
  const runActionRef = useRef<(a: CmdkAction) => void>(() => {});

  const runAction = useCallback(
    async (a: CmdkAction) => {
      if (a.kind === "nav") {
        closeCmdk();
        router.push(a.href);
        return;
      }

      // logout
      closeCmdk();
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // ignore
      }
      router.push("/login");
    },
    [closeCmdk, router],
  );

  useEffect(() => {
    filteredRef.current = filteredActions;
    idxRef.current = boundedIdx;
  }, [filteredActions, boundedIdx]);

  useEffect(() => {
    runActionRef.current = (a: CmdkAction) => {
      void runAction(a);
    };
  }, [runAction]);

  // Global key handling (Cmd/Ctrl+K + navigation inside palette)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      const hasMod = e.metaKey || e.ctrlKey;

      if (hasMod && isK) {
        e.preventDefault();
        if (cmdkOpen) closeCmdk();
        else openCmdk();
        return;
      }

      if (!cmdkOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        closeCmdk();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const len = filteredRef.current.length;
        if (len <= 0) return;
        setCmdkIdx((v) => Math.min(len - 1, v + 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCmdkIdx((v) => Math.max(0, v - 1));
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const list = filteredRef.current;
        const idx = idxRef.current;
        const a = list[idx];
        if (a) runActionRef.current(a);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cmdkOpen, openCmdk, closeCmdk]);

  // Focus input when palette opens (no setState here)
  useEffect(() => {
    if (!cmdkOpen) return;
    const t = window.setTimeout(() => cmdkInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [cmdkOpen]);

  // Account menu
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!accountOpen) return;
      const t = e.target as Node | null;
      if (!t) return;
      if (accountRef.current && !accountRef.current.contains(t)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [accountOpen]);

  return (
    <div className="min-h-dvh bg-[#0B1220] text-white">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:px-3 focus:py-2 focus:rounded-md focus:bg-white focus:text-black"
      >
        {shellT("skipToContent")}
      </a>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cx(
            "sticky top-0 h-dvh border-r border-white/10 bg-white/5 backdrop-blur transition-[width] duration-200",
            collapsed ? "w-[72px]" : "w-[276px]",
          )}
        >
          <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
            <Link href="/app/finances" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-emerald-500/90" aria-hidden="true" />
              {!collapsed && <div className="font-semibold tracking-wide">FinHub</div>}
            </Link>

            <button
              className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/10"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={shellT("sidebar.toggleAria")}
              type="button"
            >
              {collapsed ? ">>" : "<<"}
            </button>
          </div>

          <nav className="p-3 space-y-4">
            {navSections.map((sec) => (
              <div key={sec.title}>
                {!collapsed && <div className="px-2 text-[11px] uppercase tracking-wider text-white/50">{sec.title}</div>}
                <div className="mt-2 space-y-1">
                  {sec.items.map((it) => {
                    const active = isActive(pathname, it.href);
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        title={collapsed ? it.label : undefined}
                        className={cx(
                          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm border relative",
                          active
                            ? "bg-white/10 border-white/15"
                            : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10",
                        )}
                      >
                        <span
                          className={cx(
                            "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r",
                            active ? "bg-emerald-400" : "bg-transparent",
                          )}
                          aria-hidden="true"
                        />
                        <span className={cx("text-white/70 group-hover:text-white", active && "text-white")}>
                          <Icon name={it.icon} />
                        </span>
                        {!collapsed && <span className="min-w-0 truncate">{it.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-10 h-14 border-b border-white/10 bg-white/5 backdrop-blur">
            <div className="h-full px-6 flex items-center gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{meta.title}</div>
                <Breadcrumbs items={meta.breadcrumbs} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="max-w-[760px] mx-auto">
                  <button
                    type="button"
                    onClick={openCmdk}
                    className="w-full h-9 rounded-md bg-black/20 border border-white/10 px-3 text-sm text-left flex items-center justify-between hover:border-white/20"
                    aria-label={shellT("search.ariaLabel")}
                  >
                    <span className="flex items-center gap-2 text-white/70">
                      <Icon name="search" />
                      <span>{shellT("search.placeholder")}</span>
                    </span>
                    <span className="text-xs text-white/50">{shellT("search.hint")}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <button
                  type="button"
                  className="h-9 w-9 rounded-md border border-white/10 bg-black/20 hover:bg-white/5 flex items-center justify-center"
                  aria-label={shellT("notifications.label")}
                >
                  <Icon name="bell" />
                </button>

                <div className="relative" ref={accountRef}>
                  <button
                    className="h-9 px-3 rounded-md border border-white/10 bg-black/20 hover:bg-white/5 flex items-center gap-2"
                    type="button"
                    aria-label={shellT("account.label")}
                    onClick={() => setAccountOpen((v) => !v)}
                  >
                    <span className="w-6 h-6 rounded-full bg-white/20" aria-hidden="true" />
                    <span className="text-sm opacity-80 hidden md:inline">{shellT("account.label")}</span>
                  </button>

                  {accountOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md border border-white/10 bg-[#0B1220] shadow-lg overflow-hidden">
                      <Link
                        href="/app/profile"
                        className="block px-3 py-2 text-sm hover:bg-white/5"
                        onClick={() => setAccountOpen(false)}
                      >
                        {shellT("nav.profile")}
                      </Link>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/5"
                        onClick={() => {
                          setAccountOpen(false);
                          void runActionRef.current({ id: "logout", kind: "logout", label: shellT("account.logout") });
                        }}
                      >
                        {shellT("account.logout")}
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

      {/* CmdK */}
      {cmdkOpen && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={shellT("cmdk.ariaLabel")}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCmdk();
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative mx-auto mt-[12vh] w-[min(720px,92vw)] rounded-xl border border-white/10 bg-[#0B1220] shadow-2xl overflow-hidden">
            <div className="p-3 border-b border-white/10">
              <input
                ref={cmdkInputRef}
                value={cmdkQ}
                onChange={(e) => {
                  setCmdkQ(e.target.value);
                  setCmdkIdx(0);
                }}
                className="w-full h-10 rounded-md bg-black/20 border border-white/10 px-3 text-sm outline-none focus:border-white/25"
                placeholder={shellT("cmdk.inputPlaceholder")}
                aria-label={shellT("cmdk.inputAriaLabel")}
              />
            </div>

            <div className="max-h-[360px] overflow-auto p-2">
              {filteredActions.length === 0 ? (
                <div className="px-3 py-6 text-sm text-white/60">{shellT("cmdk.empty")}</div>
              ) : (
                <div className="space-y-1">
                  {filteredActions.map((a, idx) => {
                    const active = idx === boundedIdx;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onMouseEnter={() => setCmdkIdx(idx)}
                        onClick={() => runActionRef.current(a)}
                        className={cx(
                          "w-full text-left px-3 py-2 rounded-md border flex items-center justify-between gap-3",
                          active
                            ? "bg-white/10 border-white/15"
                            : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="text-sm truncate">{a.label}</div>
                          {a.hint && <div className="text-xs text-white/50 truncate">{a.hint}</div>}
                        </div>
                        <div className="text-xs text-white/40">{shellT("cmdk.enterHint")}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-3 py-2 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
              <span>{shellT("cmdk.footerHint")}</span>
              <span>{shellT("search.hint")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}







