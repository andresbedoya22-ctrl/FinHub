"use client";

import type { FinanceCategory, FinanceTransaction } from "../financesTypes";
import { formatEurFromCents } from "../financesFormat";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  category: FinanceCategory | null;
  transactions: FinanceTransaction[];
};

export function CategoryDrawer(props: Props) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={props.onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-[480px] border-l border-fh-border bg-fh-surface p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{props.title}</div>
            <div className="text-xs text-fh-muted">
              {props.category ? props.category.label : "Sin categoría"}
            </div>
          </div>
          <button
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-1 text-xs hover:bg-fh-surface-2"
            onClick={props.onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-xs text-fh-muted">Transacciones recientes</div>
          <div className="max-h-[78vh] space-y-2 overflow-auto">
            {props.transactions.length ? (
              props.transactions.map((t) => (
                <div key={t.id} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{t.merchantName}</div>
                      <div className="text-xs text-fh-muted">{t.occurredOn}</div>
                    </div>
                    <div className="text-sm font-semibold">{formatEurFromCents(t.amountCents)}</div>
                  </div>
                  {t.note ? <div className="mt-1 text-xs text-fh-muted">{t.note}</div> : null}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm text-fh-muted">
                No hay transacciones para esta categoría en el rango actual.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}