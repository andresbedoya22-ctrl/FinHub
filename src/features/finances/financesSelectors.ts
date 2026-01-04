import type {
  FinanceCategory,
  FinanceMonthlySnapshot,
  FinanceTransaction,
  FinanceUserPlan,
  IsoDate,
  IsoMonth,
} from "./financesTypes";
import { isoDateFromDate, sumCents } from "./financesFormat";

export function isInMonth(occurredOn: string, month: IsoMonth): boolean {
  return occurredOn.startsWith(month);
}

export function computeMonthlyTotals(transactions: FinanceTransaction[], month: IsoMonth): {
  incomeCents: number;         // positive
  expenseOutflowCents: number; // positive
  netCents: number;            // income - outflow
} {
  const inMonth = transactions.filter((t) => isInMonth(t.occurredOn, month));
  const amounts = inMonth.map((t) => t.amountCents);

  const incomeCents = sumCents(amounts.filter((c) => c > 0));
  const expenseSigned = sumCents(amounts.filter((c) => c < 0)); // negative
  const expenseOutflowCents = Math.abs(expenseSigned);

  const netCents = incomeCents - expenseOutflowCents;
  return { incomeCents, expenseOutflowCents, netCents };
}

export function computeFixedBudgetRemainingCents(plan: FinanceUserPlan, month: IsoMonth): number {
  // v1: fixed budgets are monthly and do not carry over; remaining == total fixed - fixed already paid (tracked later).
  // For now, we consider "remaining" to be full monthly fixed budget until we have fixed-payment tagging.
  // UI will refine this with "fixed paid" signals in F11.3+.
  void month;
  const totalFixed = sumCents(
    plan.fixedBudgets.filter((b) => b.isActive).map((b) => Math.max(0, b.monthlyCents))
  );
  return totalFixed;
}

export function computeSafeToSpendCents(args: {
  incomeCents: number;
  expenseOutflowCents: number;
  fixedBudgetRemainingCents: number;
}): number {
  // As requested:
  // income of month - expenses of month - remaining fixed budget
  return args.incomeCents - args.expenseOutflowCents - args.fixedBudgetRemainingCents;
}

export function buildDailySeries(transactions: FinanceTransaction[], month: IsoMonth): Array<{
  day: IsoDate;
  spentOutflowCents: number;   // positive
  incomeInflowCents: number;   // positive
}> {
  // Aggregate per day for the month
  const map = new Map<IsoDate, { spent: number; income: number }>();

  for (const t of transactions) {
    if (!isInMonth(t.occurredOn, month)) continue;
    const key = t.occurredOn as IsoDate;

    const curr = map.get(key) ?? { spent: 0, income: 0 };
    if (t.amountCents < 0) curr.spent += Math.abs(t.amountCents);
    if (t.amountCents > 0) curr.income += t.amountCents;
    map.set(key, curr);
  }

  // Ensure stable ordering by date
  const days = Array.from(map.keys()).sort();
  return days.map((day) => {
    const v = map.get(day)!;
    return { day, spentOutflowCents: v.spent, incomeInflowCents: v.income };
  });
}

export function buildCumulativeBurndown(daily: Array<{ day: IsoDate; spentOutflowCents: number }>): Array<{
  day: IsoDate;
  cumulativeOutflowCents: number;
  spentOutflowCents: number;
}> {
  let cum = 0;
  return daily
    .slice()
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((d) => {
      cum += d.spentOutflowCents;
      return { day: d.day, spentOutflowCents: d.spentOutflowCents, cumulativeOutflowCents: cum };
    });
}

export function computeCategoryTotalsSigned(transactions: FinanceTransaction[], categories: FinanceCategory[], month: IsoMonth): Record<string, number> {
  const byId: Record<string, FinanceCategory> = {};
  for (const c of categories) byId[c.id] = c;

  const out: Record<string, number> = {};
  for (const t of transactions) {
    if (!isInMonth(t.occurredOn, month)) continue;
    const catKey = t.categoryId ? (byId[t.categoryId]?.key ?? "uncategorized") : "uncategorized";
    out[catKey] = (out[catKey] ?? 0) + t.amountCents;
  }
  return out;
}

export function buildSnapshot(args: {
  month: IsoMonth;
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  plan: FinanceUserPlan;
}): Omit<FinanceMonthlySnapshot, "id"> {
  const { incomeCents, expenseOutflowCents, netCents } = computeMonthlyTotals(args.transactions, args.month);
  const fixedBudgetRemainingCents = computeFixedBudgetRemainingCents(args.plan, args.month);
  const safeToSpendCents = computeSafeToSpendCents({ incomeCents, expenseOutflowCents, fixedBudgetRemainingCents });

  const daily = buildDailySeries(args.transactions, args.month);
  const byCategorySigned = computeCategoryTotalsSigned(args.transactions, args.categories, args.month);

  return {
    userId: undefined,
    month: args.month,
    incomeCents,
    expenseOutflowCents,
    netCents,
    safeToSpendCents,
    breakdown: {
      byCategoryCents: byCategorySigned,
      daily: daily.map((d) => ({ day: d.day, spentOutflowCents: d.spentOutflowCents, incomeInflowCents: d.incomeInflowCents })),
    },
    createdAt: undefined,
    updatedAt: undefined,
  };
}

export function isoToday(): IsoDate {
  return isoDateFromDate(new Date());
}