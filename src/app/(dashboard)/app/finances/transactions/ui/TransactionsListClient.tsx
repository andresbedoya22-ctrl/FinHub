"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { useFinancesLedger } from "@/features/finances/financesLedgerStore";
import type { PatchTransaction } from "@/features/finances/financesLedgerApi";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { cn } from "@/ui/cn";

type TxStatus = "pending" | "approved" | "hidden";

type SortKey = "date" | "amount" | "merchant";

type SortDir = "asc" | "desc";

const STATUS_VARIANTS: Record<TxStatus, "neutral" | "success" | "warning"> = {
  pending: "warning",
  approved: "success",
  hidden: "neutral",
};

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

export default function TransactionsListClient({ initialMonth }: { initialMonth: string }) {
  const t = useTranslations("finances.transactions");
  const locale = useLocale();
  const monthLabel = useMemo(() => toMonthLabel(locale, initialMonth), [locale, initialMonth]);

  const loadLedger = useFinancesLedger((s) => s.load);
  const ledgerMonth = useFinancesLedger((s) => s.month);
  const categories = useFinancesLedger((s) => s.categories);
  const transactions = useFinancesLedger((s) => s.transactions);
  const loading = useFinancesLedger((s) => s.loading);
  const error = useFinancesLedger((s) => s.error);
  const patchTx = useFinancesLedger((s) => s.patchTx);

  const [rowSavingId, setRowSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TxStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialMonth) return;
    if (ledgerMonth === initialMonth && transactions.length > 0) return;
    void loadLedger(initialMonth);
  }, [initialMonth, ledgerMonth, transactions.length, loadLedger]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter, sortKey, sortDir]);

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
    const tx = transactions.find((item) => item.id === txId);
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

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = [...transactions];

    if (q) {
      rows = rows.filter((row) => {
        const catLabel = row.categoryId ? (categoryLabelById.get(row.categoryId) ?? row.categoryId) : "";
        return [row.merchantName, row.note ?? "", catLabel].join(" ").toLowerCase().includes(q);
      });
    }

    if (statusFilter !== "all") {
      rows = rows.filter((row) => row.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      rows = rows.filter((row) => row.categoryId === categoryFilter);
    }

    rows.sort((a, b) => {
      if (sortKey === "amount") {
        return sortDir === "asc" ? a.amountCents - b.amountCents : b.amountCents - a.amountCents;
      }
      if (sortKey === "merchant") {
        return sortDir === "asc"
          ? a.merchantName.localeCompare(b.merchantName)
          : b.merchantName.localeCompare(a.merchantName);
      }
      return sortDir === "asc"
        ? a.occurredOn.localeCompare(b.occurredOn)
        : b.occurredOn.localeCompare(a.occurredOn);
    });

    return rows;
  }, [transactions, search, statusFilter, categoryFilter, sortKey, sortDir, categoryLabelById]);

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage]);

  const selectedTx = useMemo(() => transactions.find((row) => row.id === selectedTxId) ?? null, [transactions, selectedTxId]);

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (search.trim()) chips.push(`${t("filters.search")}: ${search.trim()}`);
    if (statusFilter !== "all") chips.push(`${t("filters.status")}: ${t(`status.${statusFilter}`)}`);
    if (categoryFilter !== "all") chips.push(`${t("filters.category")}: ${categoryLabelById.get(categoryFilter) ?? categoryFilter}`);
    return chips;
  }, [search, statusFilter, categoryFilter, t, categoryLabelById]);

  return (
    <Screen className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="text-xs text-fh-muted">
            <Link className="hover:text-fh-text" href="/app/finances">
              {t("breadcrumbs.finances")}
            </Link>
            <span className="mx-2 text-fh-muted">/</span>
            <span>{t("breadcrumbs.transactions")}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <div className="text-xs text-fh-muted">{t("monthLabel", { month: monthLabel })}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center justify-center rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm font-medium text-fh-text hover:bg-fh-surface-2"
            href={`/app/finances?month=${encodeURIComponent(initialMonth)}`}
          >
            {t("actions.backToFinances")}
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-xl bg-fh-primary px-3 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90"
            href={`/app/finances/transactions/new?month=${encodeURIComponent(initialMonth)}`}
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
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="text-xs uppercase text-fh-muted">{t("filters.search")}</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface-2 px-3 py-2 text-sm"
              placeholder={t("filters.searchPlaceholder")}
            />
          </div>

          <div>
            <label className="text-xs uppercase text-fh-muted">{t("filters.status")}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter((e.target.value as "all" | TxStatus) ?? "all")}
              className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface-2 px-3 py-2 text-sm"
            >
              <option value="all">{t("filters.all")}</option>
              <option value="pending">{t("status.pending")}</option>
              <option value="approved">{t("status.approved")}</option>
              <option value="hidden">{t("status.hidden")}</option>
            </select>
          </div>

          <div>
            <label className="text-xs uppercase text-fh-muted">{t("filters.category")}</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value || "all")}
              className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface-2 px-3 py-2 text-sm"
            >
              <option value="all">{t("filters.all")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase text-fh-muted">{t("filters.sort")}</label>
            <div className="mt-1 flex gap-2">
              <select
                value={sortKey}
                onChange={(e) => setSortKey((e.target.value as SortKey) ?? "date")}
                className="w-full rounded-xl border border-fh-border bg-fh-surface-2 px-3 py-2 text-sm"
              >
                <option value="date">{t("filters.sortDate")}</option>
                <option value="amount">{t("filters.sortAmount")}</option>
                <option value="merchant">{t("filters.sortMerchant")}</option>
              </select>
              <Button type="button" variant="secondary" className="px-3" onClick={() => setSortDir((v) => (v === "asc" ? "desc" : "asc"))}>
                {sortDir === "asc" ? "A-Z" : "Z-A"}
              </Button>
            </div>
          </div>
        </div>

        {activeFilterChips.length ? (
          <div className="flex flex-wrap gap-2">
            {activeFilterChips.map((chip) => (
              <Badge key={chip} variant="neutral">{chip}</Badge>
            ))}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{t("table.title")}</div>
            <div className="text-xs text-fh-muted">{t("table.subtitle")}</div>
          </div>
          <div className="text-xs text-fh-muted">
            {loading ? t("loading") : t("summary.count", { count: filteredRows.length })}
          </div>
        </div>

        {loading && transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-fh-border bg-fh-surface-2 p-6 text-center text-sm text-fh-muted">
            {t("loading")}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-fh-border bg-fh-surface-2 p-6 text-center">
            <div className="text-sm font-semibold">{t("empty.title")}</div>
            <div className="mt-2 text-sm text-fh-muted">{t("empty.body")}</div>
            <Link
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-fh-primary px-4 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90"
              href={`/app/finances/transactions/new?month=${encodeURIComponent(initialMonth)}`}
            >
              {t("empty.cta")}
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-auto rounded-xl border border-fh-border">
              <table className="w-full text-sm">
                <thead className="bg-fh-surface-2 text-left text-xs uppercase tracking-wide text-fh-muted">
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
                  {pagedRows.map((row) => {
                    const status: TxStatus = isTxStatus(row.status) ? row.status : "pending";
                    const catLabel = row.categoryId
                      ? categoryLabelById.get(row.categoryId) ?? row.categoryId
                      : t("category.uncategorized");
                    const saving = rowSavingId === row.id;

                    return (
                      <tr key={row.id} className="border-t border-fh-border/50 hover:bg-fh-surface-2/50">
                        <td className="px-3 py-3 font-mono">{formatDateLabel(locale, row.occurredOn)}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium">{row.merchantName}</div>
                          {row.note ? <div className="text-xs text-fh-muted truncate">{row.note}</div> : null}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="neutral">{catLabel}</Badge>
                        </td>
                        <td className={cn("px-3 py-3 text-right font-mono", row.amountCents < 0 ? "" : "text-emerald-500 dark:text-emerald-300")}>
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
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              className="text-xs font-medium text-fh-muted hover:text-fh-text"
                              onClick={() => setSelectedTxId(row.id)}
                            >
                              {t("table.view")}
                            </button>
                            <Link
                              className="text-xs font-medium text-fh-muted hover:text-fh-text"
                              href={`/app/finances/transactions/${encodeURIComponent(row.id)}?month=${encodeURIComponent(initialMonth)}`}
                            >
                              {t("table.open")}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-fh-muted">
                {t("pagination.page", { page: safePage, totalPages })}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" disabled={safePage <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>
                  {t("pagination.prev")}
                </Button>
                <Button type="button" variant="secondary" disabled={safePage >= totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>
                  {t("pagination.next")}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {selectedTx ? (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={t("drawer.title")}>
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setSelectedTxId(null)} aria-label={t("drawer.close")} />
          <div className="absolute right-0 top-0 h-dvh w-[92vw] max-w-[420px] overflow-auto border-l border-fh-border bg-fh-surface p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">{t("drawer.title")}</div>
              <Button type="button" variant="ghost" onClick={() => setSelectedTxId(null)}>{t("drawer.close")}</Button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-fh-muted">{t("table.merchant")}</div>
                <div className="font-medium">{selectedTx.merchantName}</div>
              </div>
              <div>
                <div className="text-xs text-fh-muted">{t("table.date")}</div>
                <div>{formatDateLabel(locale, selectedTx.occurredOn)}</div>
              </div>
              <div>
                <div className="text-xs text-fh-muted">{t("table.amount")}</div>
                <div className="font-semibold">{formatEurFromCents(locale, selectedTx.amountCents)}</div>
              </div>
              {selectedTx.note ? (
                <div>
                  <div className="text-xs text-fh-muted">{t("drawer.note")}</div>
                  <div>{selectedTx.note}</div>
                </div>
              ) : null}
              <Link
                className="inline-flex items-center justify-center rounded-xl border border-fh-border bg-fh-surface-2 px-3 py-2 text-sm hover:bg-fh-surface"
                href={`/app/finances/transactions/${encodeURIComponent(selectedTx.id)}?month=${encodeURIComponent(initialMonth)}`}
              >
                {t("drawer.openFull")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
