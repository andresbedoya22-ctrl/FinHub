"use client";

import { useMemo } from "react";

import type { FinanceUserPlan, FinanceTransaction, IsoMonth } from "../financesTypes";
import { formatEurFromCents } from "../financesFormat";
import { computeFixedBudgetRemainingCents, computeMonthlyTotals, computeSafeToSpendCents } from "../financesSelectors";

type Props = {
  month: IsoMonth;
  transactions: FinanceTransaction[];
  plan: FinanceUserPlan;
};

export function SafeToSpendCard(props: Props) {
  const kpis = useMemo(() => {
    const { incomeCents, expenseOutflowCents } = computeMonthlyTotals(props.transactions, props.month);
    const fixedRemaining = computeFixedBudgetRemainingCents(props.plan, props.month);
    const safe = computeSafeToSpendCents({ incomeCents, expenseOutflowCents, fixedBudgetRemainingCents: fixedRemaining });

    const dot = safe >= 0 ? "ok" : safe >= -15000 ? "warn" : "warn"; // sin rojo agresivo en v1
    return { incomeCents, expenseOutflowCents, fixedRemaining, safe, dot };
  }, [props.transactions, props.month, props.plan]);

  const dotClass =
    kpis.dot === "ok" ? "bg-emerald-400" : "bg-orange-400";

  return (
    <div className="rounded-2xl border border-fh-border bg-fh-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-fh-muted">Safe to Spend</div>
          <div className="mt-1 flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
            <div className="text-2xl font-semibold tracking-tight">
              {formatEurFromCents(kpis.safe)}
            </div>
          </div>
        </div>

        <div className="text-right text-xs text-fh-muted">
          <div className="font-medium text-fh-text">{props.month}</div>
          <div>EUR only</div>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs text-fh-muted">
        <div className="flex items-center justify-between gap-3">
          <span>Ingresos del mes</span>
          <span className="font-medium text-fh-text">{formatEurFromCents(kpis.incomeCents)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Gastos del mes</span>
          <span className="font-medium text-fh-text">{formatEurFromCents(-kpis.expenseOutflowCents)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Fijos restantes (presupuesto)</span>
          <span className="font-medium text-fh-text">{formatEurFromCents(-kpis.fixedRemaining)}</span>
        </div>
      </div>
    </div>
  );
}