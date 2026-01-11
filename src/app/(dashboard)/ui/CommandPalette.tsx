"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { NavItem } from "./dashboardNav";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function matches(q: string, item: NavItem): boolean {
  if (!q) return true;
  const n = normalize(q);
  const hay = [
    item.label,
    item.href,
    ...(item.keywords ?? []),
    ...(item.section ? [item.section] : []),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(n);
}

export default function CommandPalette({ items }: { items: NavItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && k === "k") {
        e.preventDefault();
        setOpen(true);
        setQ("");
        queueMicrotask(() => inputRef.current?.focus());
      }
      if (k === "escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => items.filter((it) => matches(q, it)), [items, q]);

  const onPick = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="mx-auto mt-[12vh] w-[min(720px,calc(100vw-24px))] rounded-xl border border-white/10 bg-[#0B1220] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-white/10">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full h-10 rounded-md bg-black/20 border border-white/10 px-3 text-sm outline-none focus:border-white/25"
            placeholder="Buscar o navegar… (Esc para cerrar)"
            aria-label="Buscar comandos"
          />
        </div>

        <div className="max-h-[52vh] overflow-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm opacity-70">Sin resultados.</div>
          ) : (
            filtered.map((it) => (
              <button
                key={it.href}
                type="button"
                onClick={() => onPick(it.href)}
                className={cx(
                  "w-full text-left px-3 py-2 rounded-md border border-transparent hover:bg-white/5 hover:border-white/10",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{it.label}</div>
                    <div className="text-xs opacity-70 font-mono">{it.href}</div>
                  </div>
                  {it.section && (
                    <div className="text-xs px-2 py-1 rounded border border-white/10 bg-black/20 opacity-80">
                      {it.section}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-3 border-t border-white/10 text-xs opacity-70 flex items-center justify-between">
          <div>Tip: Cmd/Ctrl+K</div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-2 py-1 rounded border border-white/10 hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}