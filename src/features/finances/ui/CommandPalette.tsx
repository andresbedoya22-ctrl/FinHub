"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Action = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  run: () => void | Promise<void>;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actions: Action[];
};

export function CommandPalette(props: Props) {
  const { open, onOpenChange, actions } = props;

  // Como el componente retorna null cuando open=false, al abrir se monta "fresh":
  // q="" y active=0 sin necesidad de setState() en effects.
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return actions;
    return actions.filter((a) => {
      const hay = [a.label, a.hint ?? "", ...(a.keywords ?? [])].join(" ").toLowerCase();
      return hay.includes(query);
    });
  }, [q, actions]);

  // Solo side-effect permitido: focus (sistema externo/DOM).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const key = (e.key || "").toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === "k") {
        e.preventDefault();
        onOpenChange(!open);
        return;
      }
      if (!open) return;

      if (key === "escape") {
        e.preventDefault();
        onOpenChange(false);
        return;
      }

      if (key === "arrowdown") {
        e.preventDefault();
        setActive((i) => Math.min(Math.max(0, filtered.length - 1), i + 1));
        return;
      }

      if (key === "arrowup") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        return;
      }

      if (key === "enter") {
        e.preventDefault();
        const a = filtered[active];
        if (!a) return;
        void Promise.resolve(a.run()).finally(() => onOpenChange(false));
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange, filtered, active]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="absolute left-1/2 top-16 w-[92vw] max-w-[760px] -translate-x-1/2 rounded-2xl border border-fh-border bg-fh-surface shadow-xl">
        <div className="border-b border-fh-border p-3">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="Buscar: casos, documentos, toeslagen, impuestos…"
            className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none"
          />
          <div className="mt-2 text-xs text-fh-muted">
            Enter para ejecutar · Esc para cerrar · Ctrl/Cmd+K para abrir/cerrar
          </div>
        </div>

        <div className="max-h-[56vh] overflow-auto p-2">
          {filtered.length ? (
            filtered.map((a, idx) => (
              <button
                key={a.id}
                onClick={() => void Promise.resolve(a.run()).finally(() => onOpenChange(false))}
                onMouseEnter={() => setActive(idx)}
                className={[
                  "w-full rounded-xl px-3 py-2 text-left",
                  idx === active ? "bg-fh-surface-2" : "hover:bg-fh-surface-2/70",
                ].join(" ")}
              >
                <div className="text-sm font-medium">{a.label}</div>
                {a.hint ? <div className="text-xs text-fh-muted">{a.hint}</div> : null}
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-fh-border bg-fh-surface px-3 py-3 text-sm text-fh-muted">
              Sin resultados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}