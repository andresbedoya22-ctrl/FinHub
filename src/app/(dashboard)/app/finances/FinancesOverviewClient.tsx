"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { cn } from "@/ui/cn";
import { FinancesBurndownChart, type BurndownPoint } from "./FinancesBurndownChart";
import type { FinancesLedgerResponse } from "@/features/finances/financesLedgerApi";
import type { FinanceCategory, FinanceTransaction, FinancesBootstrap } from "@/features/finances/financesTypes";

type LoadState = "loading" | "ready" | "error";

type BudgetStatus = "ok" | "warn" | "risk";

type BudgetCard = {
  id: string;
  label: string;
  budgetCents: number;
  spentCents: number;
  percent: number;
  status: BudgetStatus;
};

type KpiMetric = {
  id: string;
  title: string;
  value: string;
  hint: string;
  trend?: "positive" | "negative";
};

const STATUS_VARIANTS: Record<BudgetStatus, "success" | "warning" | "danger"> = {
  ok: "success",
  warn: "warning",
  risk: "danger",
};

const STATUS_BAR: Record<BudgetStatus, string> = {
  ok: "bg-emerald-400/80",
  warn: "bg-amber-400/80",
  risk: "bg-rose-400/80",
};

function isValidMonth(input: string | null): input is string {
  return Boolean(input && /^\d{4}-\d{2}$/.test(input));
}

function toMonthLabel(locale: string, month: string): string {
  const [year, monthStr] = month.split("-");
  const y = Number(year);
  const m = Number(monthStr);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return month;
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatCurrencyFromCents(locale: string, cents: number, maxFrac = 0): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: maxFrac,
  }).format(cents / 100);
}

function formatCurrencyFromEur(locale: string, value: number, maxFrac = 0): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: maxFrac,
  }).format(value);
}

function formatPercent(locale: string, value: number): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

function formatDateLabel(locale: string, iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "2-digit" }).format(d);
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { method: "GET", cache: "no-store", headers: { accept: "application/json" }, signal });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function buildBurndownPoints(transactions: FinanceTransaction[]): BurndownPoint[] {
  const daily = new Map<string, number>();
  for (const tx of transactions) {
    if (!tx.occurredOn) continue;
    const delta = tx.amountCents / 100;
    daily.set(tx.occurredOn, (daily.get(tx.occurredOn) ?? 0) + delta);
  }
  const days = Array.from(daily.keys()).sort();
  let cumulative = 0;
  return days.map((day) => {
    cumulative += daily.get(day) ?? 0;
    return { date: day, value: cumulative };
  });
}

function resolveBudgetCategoryIds(budgetLabel: string, categories: FinanceCategory[]): string[] {
  const normalizedBudget = normalizeLabel(budgetLabel);
  if (!normalizedBudget) return [];

  const directMatches = categories.filter((c) => {
    const label = normalizeLabel(c.label);
    const key = normalizeLabel(c.key);
    return label.includes(normalizedBudget) || normalizedBudget.includes(label) || key.includes(normalizedBudget);
  });
  if (directMatches.length) return directMatches.map((c) => c.id);

  const tokenGroups: Array<{ tokens: string[] }> = [
    { tokens: ["rent", "alquiler", "huur", "housing"] },
    { tokens: ["insurance", "seguro", "seguros", "assurance"] },
    { tokens: ["utilities", "utility", "servicios", "services", "bills"] },
  ];

  for (const group of tokenGroups) {
    if (!group.tokens.some((token) => normalizedBudget.includes(token))) continue;
    const matches = categories.filter((c) => {
      const label = normalizeLabel(c.label);
      const key = normalizeLabel(c.key);
      return group.tokens.some((token) => label.includes(token) || key.includes(token));
    });
    if (matches.length) return matches.map((c) => c.id);
  }

  return [];
}

function buildBudgetCards(
  plan: FinancesBootstrap["plan"] | null,
  categories: FinanceCategory[],
  transactions: FinanceTransaction[]
): BudgetCard[] {
  const spentByCategoryId = new Map<string, number>();
  for (const tx of transactions) {
    if (!tx.categoryId) continue;
    if (tx.amountCents >= 0) continue;
    spentByCategoryId.set(tx.categoryId, (spentByCategoryId.get(tx.categoryId) ?? 0) + Math.abs(tx.amountCents));
  }

  const activeBudgets = (plan?.fixedBudgets ?? []).filter((b) => b.isActive && b.monthlyCents > 0);
  if (activeBudgets.length) {
    return activeBudgets.map((budget) => {
      const categoryIds = resolveBudgetCategoryIds(budget.label, categories);
      const spentCents = categoryIds.reduce((sum, id) => sum + (spentByCategoryId.get(id) ?? 0), 0);
      const percent = budget.monthlyCents > 0 ? spentCents / budget.monthlyCents : 0;
      const status: BudgetStatus = percent >= 0.9 ? "risk" : percent >= 0.7 ? "warn" : "ok";
      return {
        id: budget.id,
        label: budget.label,
        budgetCents: budget.monthlyCents,
        spentCents,
        percent,
        status,
      };
    });
  }

  const categorySpend = categories
    .map((c) => ({
      id: c.id,
      label: c.label,
      spent: spentByCategoryId.get(c.id) ?? 0,
    }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 4);

  return categorySpend.map((item) => {
    const budgetCents = Math.max(Math.round(item.spent * 1.2), 2000);
    const percent = item.spent / budgetCents;
    const status: BudgetStatus = percent >= 0.9 ? "risk" : percent >= 0.7 ? "warn" : "ok";
    return {
      id: item.id,
      label: item.label,
      budgetCents,
      spentCents: item.spent,
      percent,
      status,
    };
  });
}

function resolveCategoryBadge(label: string, t: ReturnType<typeof useTranslations>) {
  const normalized = normalizeLabel(label);
  const groceriesTokens = ["grocery", "grocer", "food", "market", "supermarket", "mercado"];
  const transportTokens = ["transport", "taxi", "uber", "metro", "bus", "train", "tram"];
  const entertainmentTokens = ["entertain", "cinema", "movie", "gaming", "music", "stream"];

  if (groceriesTokens.some((token) => normalized.includes(token))) {
    return { label: t("category.groceries"), variant: "success" as const };
  }
  if (transportTokens.some((token) => normalized.includes(token))) {
    return { label: t("category.transport"), variant: "warning" as const };
  }
  if (entertainmentTokens.some((token) => normalized.includes(token))) {
    return { label: t("category.entertainment"), variant: "danger" as const };
  }

  return { label, variant: "neutral" as const };
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("h-3 rounded bg-white/10 animate-pulse", className)} />;
}

export default function FinancesOverviewClient({ initialMonth }: { initialMonth: string }) {
  const t = useTranslations("finances.dashboard");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const monthParam = searchParams.get("month");
  const month = useMemo(() => (isValidMonth(monthParam) ? monthParam : initialMonth), [monthParam, initialMonth]);
  const monthLabel = useMemo(() => toMonthLabel(locale, month), [locale, month]);

  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<FinancesBootstrap | null>(null);
  const [ledger, setLedger] = useState<FinancesLedgerResponse | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    async function load() {
      setState("loading");
      setError(null);

      try {
        const [boot, ledgerData] = await Promise.all([
          fetchJson<FinancesBootstrap>("/api/finances/bootstrap", controller.signal),
          fetchJson<FinancesLedgerResponse>(`/api/finances/ledger?month=${encodeURIComponent(month)}`, controller.signal),
        ]);

        if (!alive) return;
        setBootstrap(boot);
        setLedger(ledgerData);
        setState("ready");
      } catch (err: unknown) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setState("error");
      }
    }

    void load();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [month, reloadKey]);

  const categories = useMemo(() => ledger?.categories ?? [], [ledger]);
  const transactions = useMemo(() => ledger?.transactions ?? [], [ledger]);

  const categoryLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) {
      map.set(category.id, category.label);
    }
    return map;
  }, [categories]);

  const totals = useMemo(() => {
    let incomeCents = 0;
    let outflowCents = 0;
    for (const tx of transactions) {
      if (tx.amountCents >= 0) incomeCents += tx.amountCents;
      else outflowCents += Math.abs(tx.amountCents);
    }
    const fixedBudgetCents = (bootstrap?.plan.fixedBudgets ?? [])
      .filter((b) => b.isActive)
      .reduce((sum, b) => sum + b.monthlyCents, 0);
    const effectiveIncomeCents =
      incomeCents > 0 ? incomeCents : bootstrap?.plan.projectedIncomeMonthlyCents ?? 0;
    const safeToSpendCents = effectiveIncomeCents - outflowCents - fixedBudgetCents;
    return {
      incomeCents,
      outflowCents,
      safeToSpendCents,
      fixedBudgetCents,
    };
  }, [transactions, bootstrap]);

  const budgets = useMemo(
    () => buildBudgetCards(bootstrap?.plan ?? null, categories, transactions),
    [bootstrap, categories, transactions]
  );

  const budgetTotals = useMemo(() => {
    const totalBudgetCents = budgets.reduce((sum, b) => sum + b.budgetCents, 0);
    const totalSpentCents = budgets.reduce((sum, b) => sum + b.spentCents, 0);
    const percent = totalBudgetCents > 0 ? totalSpentCents / totalBudgetCents : 0;
    return { totalBudgetCents, totalSpentCents, percent };
  }, [budgets]);

  const kpis = useMemo<KpiMetric[]>(() => {
    return [
      {
        id: "safe",
        title: t("kpis.safeToSpend"),
        value: formatCurrencyFromCents(locale, totals.safeToSpendCents),
        hint: t("kpis.safeHint"),
        trend: totals.safeToSpendCents >= 0 ? "positive" : "negative",
      },
      {
        id: "income",
        title: t("kpis.incomeReceived"),
        value: formatCurrencyFromCents(locale, totals.incomeCents),
        hint: t("kpis.monthHint", { month: monthLabel }),
      },
      {
        id: "bills",
        title: t("kpis.billsPaid"),
        value: formatCurrencyFromCents(locale, totals.outflowCents),
        hint: t("kpis.outflowHint"),
      },
      {
        id: "budget",
        title: t("kpis.budgetUsed"),
        value: formatPercent(locale, budgetTotals.percent),
        hint: t("kpis.budgetHint"),
      },
    ];
  }, [t, locale, totals, budgetTotals, monthLabel]);

  const inboxRows = useMemo(() => transactions.slice(0, 8), [transactions]);
  const burndownPoints = useMemo(() => buildBurndownPoints(transactions), [transactions]);

  return (
    <div className="space-y-6">
      {state === "error" ? (
        <Card>
          <div className="text-sm font-semibold">{t("states.errorTitle")}</div>
          <div className="mt-1 text-xs text-fh-muted">{error ?? t("states.errorBody")}</div>
          <Button className="mt-3" variant="secondary" onClick={retry}>
            {t("states.retry")}
          </Button>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {state === "loading"
          ? Array.from({ length: 4 }, (_, idx) => (
              <Card key={`kpi-${idx}`} className="space-y-3">
                <SkeletonLine className="w-28" />
                <SkeletonLine className="h-6 w-32" />
                <SkeletonLine className="w-20" />
              </Card>
            ))
          : kpis.map((kpi) => (
              <Card key={kpi.id}>
                <div className="text-xs text-fh-muted">{kpi.title}</div>
                <div
                  className={cn(
                    "mt-2 text-xl font-semibold tracking-tight",
                    kpi.trend === "negative" ? "text-rose-300" : "text-emerald-300"
                  )}
                >
                  {kpi.value}
                </div>
                <div className="mt-1 text-xs text-fh-muted">{kpi.hint}</div>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{t("inbox.title")}</div>
                <div className="text-xs text-fh-muted">{t("inbox.subtitle")}</div>
              </div>
              <Link className="text-xs text-fh-muted hover:text-fh-text" href="/app/finances/transactions">
                {t("inbox.viewAll")}
              </Link>
            </div>

            {state === "loading" ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 5 }, (_, idx) => (
                  <div key={`row-${idx}`} className="flex items-center justify-between gap-4">
                    <SkeletonLine className="h-4 w-24" />
                    <SkeletonLine className="h-4 w-40" />
                    <SkeletonLine className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : inboxRows.length ? (
              <div className="mt-4">
                <div className="hidden md:grid md:grid-cols-[110px,1.5fr,1fr,120px,120px] text-xs text-fh-muted">
                  <div>{t("table.date")}</div>
                  <div>{t("table.merchant")}</div>
                  <div>{t("table.category")}</div>
                  <div>{t("table.status")}</div>
                  <div className="text-right">{t("table.amount")}</div>
                </div>

                <div className="mt-2 divide-y divide-white/5">
                  {inboxRows.map((tx) => {
                    const categoryLabel =
                      (tx.categoryId && categoryLabelById.get(tx.categoryId)) || t("category.uncategorized");
                    const badgeMeta = resolveCategoryBadge(categoryLabel, t);
                    const statusLabel = tx.status === "approved" ? t("status.approved") : t("status.flagged");
                    const statusVariant = tx.status === "approved" ? "success" : "danger";
                    return (
                      <div
                        key={tx.id}
                        className="grid grid-cols-1 gap-2 py-3 md:grid-cols-[110px,1.5fr,1fr,120px,120px] md:items-center"
                      >
                        <div className="text-xs text-fh-muted md:text-sm">
                          {formatDateLabel(locale, tx.occurredOn)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{tx.merchantName}</div>
                          <div className="md:hidden mt-1 flex flex-wrap gap-2">
                            <Badge variant={badgeMeta.variant}>{badgeMeta.label}</Badge>
                            <Badge variant={statusVariant}>{statusLabel}</Badge>
                          </div>
                        </div>
                        <div className="hidden md:block">
                          <Badge variant={badgeMeta.variant}>{badgeMeta.label}</Badge>
                        </div>
                        <div className="hidden md:block">
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                        </div>
                        <div
                          className={cn(
                            "text-right text-sm font-semibold tabular-nums",
                            tx.amountCents < 0 ? "text-fh-text" : "text-emerald-300"
                          )}
                        >
                          {formatCurrencyFromCents(locale, tx.amountCents)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-fh-surface-2 p-6 text-center">
                <div className="text-sm font-semibold">{t("inbox.emptyTitle")}</div>
                <div className="mt-2 text-sm text-fh-muted">{t("inbox.emptyBody")}</div>
                <Link
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-fh-primary px-4 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90"
                  href="/app/finances/transactions/new"
                >
                  {t("inbox.emptyCta")}
                </Link>
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          {state === "loading" ? (
            <Card className="h-[260px] space-y-3">
              <SkeletonLine className="w-36" />
              <SkeletonLine className="w-24" />
              <div className="mt-6 h-36 rounded-xl bg-white/10 animate-pulse" />
            </Card>
          ) : (
            <FinancesBurndownChart
              points={burndownPoints}
              title={t("burndown.title")}
              subtitle={t("burndown.subtitle")}
              currencyLabel={t("burndown.currency")}
              emptyTitle={t("burndown.emptyTitle")}
              emptyBody={t("burndown.emptyBody")}
              formatCurrency={(value) => formatCurrencyFromEur(locale, value)}
            />
          )}
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{t("budgets.title")}</div>
            <div className="text-xs text-fh-muted">{t("budgets.subtitle", { month: monthLabel })}</div>
          </div>
          <Link className="text-xs text-fh-muted hover:text-fh-text" href="/app/finances/transactions">
            {t("actions.review")}
          </Link>
        </div>

        {state === "loading" ? (
          <div className="mt-4 space-y-4">
            {Array.from({ length: 3 }, (_, idx) => (
              <div key={`budget-skel-${idx}`} className="space-y-2">
                <SkeletonLine className="w-40" />
                <SkeletonLine className="w-28" />
                <div className="h-2 w-full rounded-full bg-white/10 animate-pulse" />
              </div>
            ))}
          </div>
        ) : budgets.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {budgets.map((budget) => {
              const remaining = Math.max(budget.budgetCents - budget.spentCents, 0);
              return (
                <div key={budget.id} className="rounded-xl border border-white/10 bg-fh-surface-2 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{budget.label}</div>
                    <Badge variant={STATUS_VARIANTS[budget.status]}>
                      {t(`budgets.status.${budget.status}`)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-fh-muted">
                    <span>
                      {t("budgets.used")} {formatCurrencyFromCents(locale, budget.spentCents)}
                    </span>
                    <span>
                      {t("budgets.remaining")} {formatCurrencyFromCents(locale, remaining)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                    <div
                      className={cn("h-2 rounded-full", STATUS_BAR[budget.status])}
                      style={{ width: `${Math.min(budget.percent * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-fh-surface-2 p-4">
            <div className="text-sm font-semibold">{t("budgets.emptyTitle")}</div>
            <div className="mt-1 text-sm text-fh-muted">{t("budgets.emptyBody")}</div>
            <Link
              className="mt-3 inline-flex items-center justify-center rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-xs hover:bg-fh-surface-2"
              href="/app/finances/transactions"
            >
              {t("budgets.emptyCta")}
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
