"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { useFinancesLedger } from "@/features/finances/financesLedgerStore";
import type { PatchTransaction } from "@/features/finances/financesLedgerApi";
import { Badge } from "@/ui/components/Badge";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { cn } from "@/ui/cn";

type TxStatus = "pending" | "approved" | "hidden";

const STATUS_VARIANTS: Record<TxStatus, "neutral" | "success" | "warning"> = {
  pending: "warning",
  approved: "success",
  hidden: "neutral",
};

function isoMonthNow(): string {
  return new Date().toISOString().slice(0, 7);
}

function isTxStatus(x: unknown): x is TxStatus {
  return x === "pending" || x === "approved" || x === "hidden";
}

function normalizeReviewedAt(prevReviewedAt: string | null, nextStatus: TxStatus): string | null {
  if (nextStatus !== "approved") return null;
  return prevReviewedAt ?? new Date().toISOString();
}

function formatEurFromCents(locale: string, cents: number): string {
  const v = (Number.isFinite(cents) ? cents : 0) / 100;
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(v);
}

function toMonthLabel(locale: string, month: string): string {
  const [year, monthStr] = month.split("-");
  const y = Number(year);
  const m = Number(monthStr);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return month;
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

function formatDateLabel(locale: string, iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "2-digit" }).format(d);
}

export default function TransactionsListClient() {
  const t = useTranslations("finances.transactions");
  const locale = useLocale();
  const sp = useSearchParams();

  const monthFromQuery = sp.get("month") ?? "";
  const month = monthFromQuery || isoMonthNow();
  const monthLabel = useMemo(() => toMonthLabel(locale, month), [locale, month]);

  const loadLedger = useFinancesLedger((s) => s.load);
  const ledgerMonth = useFinancesLedger((s) => s.month);
  const categories = useFinancesLedger((s) => s.categories);
  const transactions = useFinancesLedger((s) => s.transactions);
  const loading = useFinancesLedger((s) => s.loading);
  const error = useFinancesLedger((s) => s.error);
  const patchTx = useFinancesLedger((s) => s.patchTx);

  const [rowSavingId, setRowSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  useEffect(() => {
    if (!month) return;
    if (ledgerMonth === month && transactions.length > 0) return;
    void loadLedger(month);
  }, [month, ledgerMonth, transactions.length, loadLedger]);

  const categoryLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories ?? []) {
      if (typeof c?.id === "string" && c.id) {
        map.set(c.id, c.label || c.key || c.id);
      }
    }
    return map;
  }, [categories]);

  const onQuickStatus = async (txId: string, next: TxStatus) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;

    setRowSavingId(txId);
    setRowError(null);

    try {
      const patch: PatchTransaction = {
        status: next,
        categoryId: tx.categoryId ?? null,
        note: tx.note ?? null,
        reviewedAt: normalizeReviewedAt(tx.reviewedAt ?? null, next),
      };

      await patchTx(txId, patch);
    } catch (e: unknown) {
      setRowError(e instanceof Error ? e.message : t("errors.updateStatus"));
    } finally {
      setRowSavingId(null);
    }
  };

  return (
    <Screen className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="text-xs text-fh-muted">
            <Link className="hover:text-fh-text" href="/app/finances">
              {t("breadcrumbs.finances")}
            </Link>
            <span className="mx-2 text-white/20">/</span>
            <span>{t("breadcrumbs.transactions")}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <div className="text-xs text-fh-muted">{t("monthLabel", { month: monthLabel })}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center justify-center rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm font-medium text-fh-text hover:bg-fh-surface-2"
            href={`/app/finances?month=${encodeURIComponent(month)}`}
          >
            {t("actions.backToFinances")}
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-xl bg-fh-primary px-3 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90"
            href={`/app/finances/transactions/new?month=${encodeURIComponent(month)}`}
          >
            {t("actions.newTransaction")}
          </Link>
        </div>
      </div>

      {(error || rowError) && (
        <InfoBox variant="danger" title={t("errors.title")}>
          {rowError ?? error}
        </InfoBox>
      )}

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{t("table.title")}</div>
            <div className="text-xs text-fh-muted">{t("table.subtitle")}</div>
          </div>
          <div className="text-xs text-fh-muted">
            {loading ? t("loading") : t("summary.count", { count: transactions.length })}
          </div>
        </div>

        {loading && transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-fh-surface-2 p-6 text-center text-sm text-fh-muted">
            {t("loading")}
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-fh-surface-2 p-6 text-center">
            <div className="text-sm font-semibold">{t("empty.title")}</div>
            <div className="mt-2 text-sm text-fh-muted">{t("empty.body")}</div>
            <Link
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-fh-primary px-4 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90"
              href={`/app/finances/transactions/new?month=${encodeURIComponent(month)}`}
            >
              {t("empty.cta")}
            </Link>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-fh-surface-2/95 text-left text-xs uppercase tracking-wide text-fh-muted backdrop-blur">
                <tr>
                  <th className="px-3 py-2">{t("table.date")}</th>
                  <th className="px-3 py-2">{t("table.merchant")}</th>
                  <th className="px-3 py-2">{t("table.category")}</th>
                  <th className="px-3 py-2 text-right">{t("table.amount")}</th>
                  <th className="px-3 py-2">{t("table.status")}</th>
                  <th className="px-3 py-2 text-right">{t("table.actions")}</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((row) => {
                  const status: TxStatus = isTxStatus(row.status) ? row.status : "pending";
                  const catLabel = row.categoryId
                    ? categoryLabelById.get(row.categoryId) ?? row.categoryId
                    : t("category.uncategorized");
                  const saving = rowSavingId === row.id;

                  return (
                    <tr key={row.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-3 py-3 font-mono">{formatDateLabel(locale, row.occurredOn)}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{row.merchantName}</div>
                        {row.note ? <div className="text-xs text-fh-muted truncate">{row.note}</div> : null}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="neutral">{catLabel}</Badge>
                      </td>
                      <td className={cn("px-3 py-3 text-right font-mono", row.amountCents < 0 ? "" : "text-emerald-300")}>
                        {formatEurFromCents(locale, row.amountCents)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={STATUS_VARIANTS[status]}>{t(`status.${status}`)}</Badge>
                          <select
                            className="rounded-lg border border-fh-border bg-fh-surface-2 px-2 py-1 text-xs text-fh-text disabled:opacity-50"
                            value={status}
                            disabled={saving}
                            aria-label={t("table.statusAria")}
                            onChange={(e) => {
                              const v = e.target.value;
                              const next: TxStatus = isTxStatus(v) ? v : "pending";
                              void onQuickStatus(row.id, next);
                            }}
                          >
                            <option value="pending">{t("status.pending")}</option>
                            <option value="approved">{t("status.approved")}</option>
                            <option value="hidden">{t("status.hidden")}</option>
                          </select>
                          {saving && <span className="text-xs text-fh-muted">{t("table.saving")}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          className="text-xs font-medium text-fh-muted hover:text-fh-text"
                          href={`/app/finances/transactions/${encodeURIComponent(row.id)}?month=${encodeURIComponent(month)}`}
                        >
                          {t("table.open")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Screen>
  );
}
