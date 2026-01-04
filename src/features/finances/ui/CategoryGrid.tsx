"use client";

import { useMemo } from "react";

import type { FinanceCategory, FinanceTransaction, IsoMonth } from "../financesTypes";
import { formatEurFromCents } from "../financesFormat";
import { isInMonth } from "../financesSelectors";

type Props = {
  month: IsoMonth;
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  onOpenCategory: (categoryId: string | null) => void;
};

function miniSparkline(values: number[]): string {
  if (!values.length) return "";
  const w = 96;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);

  return values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function CategoryGrid(props: Props) {
  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of props.transactions) {
      if (!isInMonth(t.occurredOn, props.month)) continue;
      const key = t.categoryId ?? "uncategorized";
      out[key] = (out[key] ?? 0) + t.amountCents;
    }
    return out;
  }, [props.transactions, props.month]);

  const spark = useMemo(() => {
    // Build naive 30-day trend per category: last N tx amounts (absolute)
    const byCat: Record<string, number[]> = {};
    const inMonth = props.transactions
      .filter((t) => isInMonth(t.occurredOn, props.month))
      .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));

    for (const t of inMonth) {
      const key = t.categoryId ?? "uncategorized";
      const arr = byCat[key] ?? [];
      arr.push(Math.abs(t.amountCents));
      byCat[key] = arr.slice(-12);
    }
    return byCat;
  }, [props.transactions, props.month]);

  const sorted = props.categories.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Presupuesto y categorías</div>
        <div className="text-xs text-fh-muted">Click para inspeccionar sin salir del dashboard</div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {sorted.map((c) => {
          const total = totals[c.id] ?? 0;
          const s = spark[c.id] ?? [];
          const p = miniSparkline(s);

          return (
            <button
              key={c.id}
              onClick={() => props.onOpenCategory(c.id)}
              className="rounded-2xl border border-fh-border bg-fh-surface p-4 text-left hover:bg-fh-surface-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{c.label}</div>
                  <div className="mt-1 text-xs text-fh-muted">{props.month}</div>
                </div>

                <div className="text-sm font-semibold">
                  {formatEurFromCents(total)}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs text-fh-muted">Tendencia</div>
                <svg width="96" height="28" viewBox="0 0 96 28" className="opacity-75">
                  {p ? <path d={p} fill="none" stroke="currentColor" strokeWidth="2" className="text-fh-muted" /> : null}
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}