"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { FinanceCategory, FinanceTransaction } from "../financesTypes";
import { formatEurFromCents } from "../financesFormat";

type Props = {
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  onChange: (next: FinanceTransaction[]) => void;
  onSplit: (tx: FinanceTransaction) => void;
};

export function TransactionsInboxTable(props: Props) {
  const rows = useMemo(
    () => props.transactions.slice().sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)),
    [props.transactions]
  );

  const [focusedId, setFocusedId] = useState<string | null>(rows[0]?.id ?? null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");

  const lastClickedIndexRef = useRef<number | null>(null);

  // Fallback sin setState en effect (prohibido por lint): usamos un "effectiveFocusedId"
  const effectiveFocusedId = useMemo(() => {
    if (focusedId && rows.some((r) => r.id === focusedId)) return focusedId;
    return rows[0]?.id ?? null;
  }, [focusedId, rows]);

  function toggleSelect(id: string, idx: number, shiftKey: boolean) {
    if (shiftKey && lastClickedIndexRef.current !== null) {
      const a = Math.min(lastClickedIndexRef.current, idx);
      const b = Math.max(lastClickedIndexRef.current, idx);
      const rangeIds = rows.slice(a, b + 1).map((r) => r.id);
      const merged = Array.from(new Set([...selectedIds, ...rangeIds]));
      setSelectedIds(merged);
    } else {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      lastClickedIndexRef.current = idx;
    }
    setFocusedId(id);
  }

  function patchTx(id: string, patch: Partial<FinanceTransaction>) {
    props.onChange(props.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function bulkPatch(patch: Partial<FinanceTransaction>) {
    if (!selectedIds.length) return;
    props.onChange(props.transactions.map((t) => (selectedIds.includes(t.id) ? { ...t, ...patch } : t)));
  }

  function approveFocused() {
    if (!effectiveFocusedId) return;

    patchTx(effectiveFocusedId, { status: "approved", reviewedAt: new Date().toISOString() });

    const idx = rows.findIndex((r) => r.id === effectiveFocusedId);
    const next = rows[idx + 1]?.id ?? rows[idx]?.id ?? null;
    setFocusedId(next);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = (e.key || "").toLowerCase();

      if (key === "a") {
        e.preventDefault();
        approveFocused();
        return;
      }

      if (key === "arrowdown" || key === "arrowup") {
        e.preventDefault();
        if (!effectiveFocusedId) return;

        const idx = rows.findIndex((r) => r.id === effectiveFocusedId);
        const nextIdx = key === "arrowdown" ? Math.min(rows.length - 1, idx + 1) : Math.max(0, idx - 1);
        setFocusedId(rows[nextIdx]?.id ?? effectiveFocusedId);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rows, effectiveFocusedId, props.transactions]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Inbox de transacciones</div>
        <div className="text-xs text-fh-muted">
          Pendientes resaltadas — usa A para aprobar, flechas para navegar
        </div>
      </div>

      <div className="relative rounded-2xl border border-fh-border bg-fh-surface">
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-fh-surface">
              <tr className="border-b border-fh-border text-xs text-fh-muted">
                <th className="w-10 px-3 py-2 text-left"></th>
                <th className="w-[120px] px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Merchant</th>
                <th className="w-[220px] px-3 py-2 text-left">Categoría</th>
                <th className="w-[140px] px-3 py-2 text-right">Monto</th>
                <th className="w-[120px] px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((t, idx) => {
                const isPending = t.status === "pending";
                const isFocused = effectiveFocusedId === t.id;
                const isSelected = selectedIds.includes(t.id);

                return (
                  <tr
                    key={t.id}
                    className={[
                      "border-b border-fh-border/70",
                      isPending ? "bg-fh-surface-2/60" : "bg-transparent",
                      isFocused ? "outline outline-2 outline-fh-accent/40" : "",
                    ].join(" ")}
                    onClick={(e) => toggleSelect(t.id, idx, (e as unknown as MouseEvent).shiftKey)}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(t.id, idx, false)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>

                    <td className="px-3 py-2 text-xs text-fh-muted">{t.occurredOn}</td>

                    <td className="px-3 py-2">
                      <div className="font-medium">{t.merchantName}</div>
                      <div className="text-xs text-fh-muted">{t.source === "ocr" ? "OCR" : "Manual"}</div>
                    </td>

                    <td className="px-3 py-2">
                      <select
                        className="w-full rounded-xl border border-fh-border bg-fh-surface px-2 py-1 text-sm"
                        value={t.categoryId ?? ""}
                        onChange={(e) => patchTx(t.id, { categoryId: e.target.value || null })}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Sin categoría</option>
                        {props.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-3 py-2 text-right font-medium">{formatEurFromCents(t.amountCents)}</td>

                    <td className="px-3 py-2 text-right">
                      <button
                        className="rounded-xl border border-fh-border bg-fh-surface px-3 py-1 text-xs hover:bg-fh-surface-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          patchTx(t.id, { status: "approved", reviewedAt: new Date().toISOString() });
                        }}
                      >
                        Aprobar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selectedIds.length ? (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-fh-border bg-fh-surface px-3 py-2">
            <div className="text-xs text-fh-muted">
              Seleccionadas: <span className="font-medium text-fh-text">{selectedIds.length}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-xl border border-fh-border bg-fh-surface px-2 py-1 text-xs"
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value)}
              >
                <option value="">Editar categoría…</option>
                {props.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              <button
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-1 text-xs hover:bg-fh-surface-2 disabled:opacity-60"
                onClick={() => {
                  if (!bulkCategoryId) return;
                  bulkPatch({ categoryId: bulkCategoryId });
                  setBulkCategoryId("");
                }}
                disabled={!bulkCategoryId}
              >
                Aplicar
              </button>

              <button
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-1 text-xs hover:bg-fh-surface-2"
                onClick={() => bulkPatch({ status: "hidden" })}
              >
                Ocultar
              </button>

              <button
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-1 text-xs hover:bg-fh-surface-2 disabled:opacity-60"
                disabled={selectedIds.length !== 1}
                onClick={() => {
                  const tx = props.transactions.find((x) => x.id === selectedIds[0]);
                  if (tx) props.onSplit(tx);
                }}
              >
                Dividir
              </button>

              <button
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-1 text-xs hover:bg-fh-surface-2"
                onClick={() => setSelectedIds([])}
              >
                Limpiar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}