"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { useFinancesLedger } from "@/features/finances/financesLedgerStore";
import type { FinanceTransactionSplit } from "@/features/finances/financesTypes";
import type { PatchTransaction } from "@/features/finances/financesLedgerApi";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { cn } from "@/ui/cn";

type TxStatus = "pending" | "approved" | "hidden";

type SplitDraftRow = {
  key: string; // stable key for rendering
  id: string; // server id or temp id
  categoryId: string | null;
  amountEur: string; // user input (EUR)
  note: string;
};

type ParseError = "required" | "format" | "invalidNumber" | "invalidDecimals";

function asString(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function isoMonthNow(): string {
  return new Date().toISOString().slice(0, 7);
}

function isTxStatus(x: unknown): x is TxStatus {
  return x === "pending" || x === "approved" || x === "hidden";
}

function formatEurFromCents(locale: string, cents: number): string {
  const v = (Number.isFinite(cents) ? cents : 0) / 100;
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(v);
}

function eurInputFromCents(cents: number): string {
  const v = (Number.isFinite(cents) ? cents : 0) / 100;
  return v.toFixed(2);
}

function toMonthLabel(locale: string, month: string): string {
  const [year, monthStr] = month.split("-");
  const y = Number(year);
  const m = Number(monthStr);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return month;
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

function parseEurToCents(input: string): { ok: true; cents: number } | { ok: false; error: ParseError } {
  const raw = input.trim().replace(",", ".");
  if (!raw) return { ok: false, error: "required" };
  if (!/^-?\d+(\.\d{0,2})?$/.test(raw)) return { ok: false, error: "format" };

  const parts = raw.split(".");
  const intPart = parts[0] ?? "0";
  const decPart = parts[1] ?? "";

  const sign = intPart.startsWith("-") ? -1 : 1;
  const absInt = Math.abs(Number(intPart));
  if (!Number.isFinite(absInt)) return { ok: false, error: "invalidNumber" };

  const dec2 = (decPart + "00").slice(0, 2);
  const dec = Number(dec2);
  if (!Number.isFinite(dec)) return { ok: false, error: "invalidDecimals" };

  const cents = sign * (absInt * 100 + dec);
  return { ok: true, cents };
}

function normalizeReviewedAt(prevReviewedAt: string | null, nextStatus: TxStatus): string | null {
  if (nextStatus !== "approved") return null;
  return prevReviewedAt ?? new Date().toISOString();
}

function newKey(): string {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? (crypto.randomUUID as () => string)() : `${Date.now()}_${Math.random()}`;
  return `k_${rnd}`;
}

function splitsToDraftRows(splits: FinanceTransactionSplit[]): SplitDraftRow[] {
  return (splits ?? []).map((s) => ({
    key: newKey(),
    id: s.id,
    categoryId: s.categoryId ?? null,
    amountEur: eurInputFromCents(Number(s.splitAmountCents ?? 0)),
    note: s.note ?? "",
  }));
}

function normalizeDraftForCompare(
  rows: SplitDraftRow[]
): { ok: true; value: Array<{ categoryId: string | null; splitAmountCents: number; note: string | null }> } | { ok: false; error: ParseError } {
  const out: Array<{ categoryId: string | null; splitAmountCents: number; note: string | null }> = [];
  for (const r of rows) {
    const parsed = parseEurToCents(r.amountEur);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    out.push({
      categoryId: r.categoryId ?? null,
      splitAmountCents: parsed.cents,
      note: r.note.trim() ? r.note.trim() : null,
    });
  }
  return { ok: true, value: out };
}

export default function TransactionDetailClient() {
  const t = useTranslations("finances.transactions");
  const locale = useLocale();
  const params = useParams();
  const sp = useSearchParams();

  const id = useMemo(() => {
    const raw = (params as Record<string, unknown>)?.id;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
    return "";
  }, [params]);

  const monthFromQuery = sp.get("month") ?? "";
  const month = monthFromQuery || isoMonthNow();
  const monthLabel = useMemo(() => toMonthLabel(locale, month), [locale, month]);

  const loadLedger = useFinancesLedger((s) => s.load);
  const ledgerMonth = useFinancesLedger((s) => s.month);
  const categories = useFinancesLedger((s) => s.categories);
  const transactions = useFinancesLedger((s) => s.transactions);
  const loading = useFinancesLedger((s) => s.loading);
  const ledgerError = useFinancesLedger((s) => s.error);
  const patchTx = useFinancesLedger((s) => s.patchTx);

  const tx = useMemo(() => transactions.find((t) => t.id === id) ?? null, [transactions, id]);

  const [splits, setSplits] = useState<FinanceTransactionSplit[]>([]);
  const [splitsLoading, setSplitsLoading] = useState(false);
  const [splitsError, setSplitsError] = useState<string | null>(null);

  const [splitsDraft, setSplitsDraft] = useState<SplitDraftRow[]>([]);
  const [splitsSaving, setSplitsSaving] = useState(false);
  const [splitsSaveError, setSplitsSaveError] = useState<string | null>(null);
  const [splitsSaveOk, setSplitsSaveOk] = useState<string | null>(null);

  const [draftStatus, setDraftStatus] = useState<TxStatus>("pending");
  const [draftCategoryId, setDraftCategoryId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  useEffect(() => {
    if (!month) return;
    if (ledgerMonth === month && transactions.length > 0) return;
    void loadLedger(month);
  }, [month, ledgerMonth, transactions.length, loadLedger]);

  useEffect(() => {
    if (!tx) return;
    setDraftStatus(isTxStatus(tx.status) ? tx.status : "pending");
    setDraftCategoryId(tx.categoryId ?? null);
    setDraftNote(tx.note ?? "");
    setSaveError(null);
    setSaveOk(null);
  }, [tx]);

  useEffect(() => {
    if (!id) return;
    setSplits([]);
    setSplitsDraft([]);
    setSplitsError(null);
    setSplitsSaveError(null);
    setSplitsSaveOk(null);

    const run = async () => {
      setSplitsLoading(true);
      try {
        const res = await fetch(`/api/finances/transactions/${encodeURIComponent(id)}/splits`, { method: "GET" });
        const text = await res.text();
        const jsonUnknown = text ? (JSON.parse(text) as unknown) : null;

        if (!res.ok) {
          const msg =
            jsonUnknown && typeof jsonUnknown === "object" && "error" in (jsonUnknown as Record<string, unknown>)
              ? asString((jsonUnknown as Record<string, unknown>).error)
              : t("detail.splits.loadError", { status: res.status });
          throw new Error(msg);
        }

        const arr = Array.isArray(jsonUnknown) ? jsonUnknown : [];
        const parsed: FinanceTransactionSplit[] = arr
          .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
          .filter((x): x is Record<string, unknown> => !!x)
          .map((x) => ({
            id: asString(x.id),
            userId: "",
            transactionId: asString(x.transactionId),
            categoryId: typeof x.categoryId === "string" ? x.categoryId : null,
            splitAmountCents: Number(x.splitAmountCents ?? 0),
            note: typeof x.note === "string" ? x.note : null,
            createdAt: "",
            updatedAt: "",
          }));

        setSplits(parsed);
        setSplitsDraft(splitsToDraftRows(parsed));
      } catch (e: unknown) {
        setSplitsError(e instanceof Error ? e.message : t("detail.splits.loadErrorFallback"));
      } finally {
        setSplitsLoading(false);
      }
    };

    void run();
  }, [id, t]);

  const categoryOptions = useMemo(() => {
    const base = [{ id: "", label: t("detail.category.none") }];
    const mapped = (categories ?? [])
      .filter((c) => typeof c.id === "string" && c.id.length > 0)
      .map((c) => ({ id: c.id, label: c.label || c.key || c.id }));
    return [...base, ...mapped];
  }, [categories, t]);

  const dirty = useMemo(() => {
    if (!tx) return false;
    const s0: TxStatus = isTxStatus(tx.status) ? tx.status : "pending";
    const c0 = tx.categoryId ?? null;
    const n0 = tx.note ?? "";
    return draftStatus !== s0 || (draftCategoryId ?? null) !== c0 || draftNote !== n0;
  }, [tx, draftStatus, draftCategoryId, draftNote]);

  const splitsCompareBase = useMemo(() => normalizeDraftForCompare(splitsToDraftRows(splits)), [splits]);
  const splitsCompareDraft = useMemo(() => normalizeDraftForCompare(splitsDraft), [splitsDraft]);

  const splitsDirty = useMemo(() => {
    if (!splitsCompareBase.ok || !splitsCompareDraft.ok) return true;
    return JSON.stringify(splitsCompareBase.value) !== JSON.stringify(splitsCompareDraft.value);
  }, [splitsCompareBase, splitsCompareDraft]);

  const splitsSum = useMemo(() => {
    const norm = normalizeDraftForCompare(splitsDraft);
    if (!norm.ok) return { ok: false as const, sumCents: 0, error: norm.error };
    const sumCents = norm.value.reduce((acc, s) => acc + s.splitAmountCents, 0);
    return { ok: true as const, sumCents, norm: norm.value };
  }, [splitsDraft]);

  const splitsDelta = useMemo(() => {
    if (!tx) return 0;
    const sum = splitsSum.ok ? splitsSum.sumCents : 0;
    return tx.amountCents - sum;
  }, [tx, splitsSum]);

  const parseErrorLabel = (err: ParseError) => t(`detail.splits.errors.${err}`);

  const onSave = async () => {
    if (!tx) return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(null);

    try {
      const patch: PatchTransaction = {
        status: draftStatus,
        categoryId: draftCategoryId ?? null,
        note: draftNote ? draftNote : null,
        reviewedAt: normalizeReviewedAt(tx.reviewedAt ?? null, draftStatus),
      };

      await patchTx(tx.id, patch);
      setSaveOk(t("detail.save.ok"));
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : t("detail.save.error"));
    } finally {
      setSaving(false);
    }
  };

  const onResetSplits = () => {
    setSplitsDraft(splitsToDraftRows(splits));
    setSplitsSaveError(null);
    setSplitsSaveOk(null);
  };

  const onAddSplit = () => {
    const suggest = tx ? splitsDelta : 0;
    setSplitsDraft((prev) => [
      ...prev,
      {
        key: newKey(),
        id: `tmp_${newKey()}`,
        categoryId: null,
        amountEur: eurInputFromCents(suggest),
        note: "",
      },
    ]);
    setSplitsSaveError(null);
    setSplitsSaveOk(null);
  };

  const onRemoveSplit = (key: string) => {
    setSplitsDraft((prev) => prev.filter((r) => r.key !== key));
    setSplitsSaveError(null);
    setSplitsSaveOk(null);
  };

  const onSaveSplits = async () => {
    if (!tx) return;

    setSplitsSaving(true);
    setSplitsSaveError(null);
    setSplitsSaveOk(null);

    try {
      if (!splitsSum.ok) throw new Error(parseErrorLabel(splitsSum.error));

      const delta = tx.amountCents - splitsSum.sumCents;
      if (delta !== 0) {
        throw new Error(t("detail.splits.deltaError", { delta: formatEurFromCents(locale, delta) }));
      }

      const payload = splitsSum.norm;

      const res = await fetch(`/api/finances/transactions/${encodeURIComponent(tx.id)}/splits`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ splits: payload }),
      });

      const text = await res.text();
      const jsonUnknown = text ? (JSON.parse(text) as unknown) : null;

      if (!res.ok) {
        const msg =
          jsonUnknown && typeof jsonUnknown === "object" && "error" in (jsonUnknown as Record<string, unknown>)
            ? asString((jsonUnknown as Record<string, unknown>).error)
            : t("detail.splits.saveError", { status: res.status });
        throw new Error(msg);
      }

      const obj = jsonUnknown && typeof jsonUnknown === "object" ? (jsonUnknown as Record<string, unknown>) : null;
      const arr = obj && "splits" in obj && Array.isArray(obj.splits) ? (obj.splits as unknown[]) : [];

      const parsed: FinanceTransactionSplit[] = arr
        .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
        .filter((x): x is Record<string, unknown> => !!x)
        .map((x) => ({
          id: asString(x.id),
          userId: "",
          transactionId: asString(x.transactionId),
          categoryId: typeof x.categoryId === "string" ? x.categoryId : null,
          splitAmountCents: Number(x.splitAmountCents ?? 0),
          note: typeof x.note === "string" ? x.note : null,
          createdAt: "",
          updatedAt: "",
        }));

      setSplits(parsed);
      setSplitsDraft(splitsToDraftRows(parsed));
      setSplitsSaveOk(t("detail.splits.saveOk"));
    } catch (e: unknown) {
      setSplitsSaveError(e instanceof Error ? e.message : t("detail.splits.saveErrorFallback"));
    } finally {
      setSplitsSaving(false);
    }
  };

  if (!id) {
    return (
      <Screen className="space-y-4">
        <InfoBox variant="warning" title={t("detail.invalidId.title")}>
          {t("detail.invalidId.body")}
        </InfoBox>
        <Link className="text-sm text-fh-muted hover:text-fh-text" href="/app/finances/transactions">
          {t("detail.actions.backToList")}
        </Link>
      </Screen>
    );
  }

  return (
    <Screen className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="text-xs text-fh-muted">
            <Link className="hover:text-fh-text" href="/app/finances">
              {t("breadcrumbs.finances")}
            </Link>
            <span className="mx-2 text-white/20">/</span>
            <Link className="hover:text-fh-text" href="/app/finances/transactions">
              {t("breadcrumbs.transactions")}
            </Link>
            <span className="mx-2 text-white/20">/</span>
            <span>{t("detail.breadcrumb")}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("detail.title")}</h1>
          <div className="text-xs text-fh-muted">{t("detail.monthLabel", { month: monthLabel })}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center justify-center rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm font-medium text-fh-text hover:bg-fh-surface-2"
            href={`/app/finances/transactions?month=${encodeURIComponent(month)}`}
          >
            {t("detail.actions.backToList")}
          </Link>
          <Button disabled={!tx || !dirty || saving} onClick={onSave}>
            {saving ? t("detail.actions.saving") : t("detail.actions.save")}
          </Button>
        </div>
      </div>

      {(ledgerError || saveError) && (
        <InfoBox variant="danger" title={t("errors.title")}>
          {saveError ?? ledgerError}
        </InfoBox>
      )}
      {saveOk && (
        <InfoBox variant="info" title={t("detail.save.title")}>
          {saveOk}
        </InfoBox>
      )}

      {!tx ? (
        <Card>
          <div className="text-sm font-semibold">{t("detail.notFound.title")}</div>
          <div className="mt-2 text-sm text-fh-muted">{t("detail.notFound.body")}</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-fh-muted">{t("detail.merchant.label")}</div>
                  <div className="text-lg font-semibold">{tx.merchantName}</div>
                  <div className="text-xs text-fh-muted font-mono">{tx.id}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-fh-muted">{t("detail.amount.label")}</div>
                  <div className="text-2xl font-semibold">{formatEurFromCents(locale, tx.amountCents)}</div>
                  <div className="text-xs text-fh-muted">{tx.currency}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="text-xs text-fh-muted mb-2">{t("detail.date.label")}</div>
                  <div className="font-mono text-sm">{tx.occurredOn}</div>
                </div>

                <div>
                  <label className="text-xs text-fh-muted block mb-2">{t("detail.status.label")}</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={draftStatus === "approved" ? "success" : draftStatus === "pending" ? "warning" : "neutral"}>
                      {t(`status.${draftStatus}`)}
                    </Badge>
                    <select
                      className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
                      value={draftStatus}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftStatus(isTxStatus(v) ? v : "pending");
                        setSaveOk(null);
                      }}
                    >
                      <option value="pending">{t("status.pending")}</option>
                      <option value="approved">{t("status.approved")}</option>
                      <option value="hidden">{t("status.hidden")}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-fh-muted block mb-2">{t("detail.category.label")}</label>
                  <select
                    className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
                    value={draftCategoryId ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraftCategoryId(v ? v : null);
                      setSaveOk(null);
                    }}
                  >
                    {categoryOptions.map((c) => (
                      <option key={c.id || "__none"} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-fh-muted block mb-2">{t("detail.note.label")}</label>
                <textarea
                  className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm min-h-[120px]"
                  value={draftNote}
                  onChange={(e) => {
                    setDraftNote(e.target.value);
                    setSaveOk(null);
                  }}
                  placeholder={t("detail.note.placeholder")}
                />
                <div className="mt-2 text-xs text-fh-muted">{t("detail.note.helper")}</div>
              </div>
            </Card>

            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{t("detail.splits.title")}</div>
                  <div className="text-xs text-fh-muted">{t("detail.splits.subtitle")}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={onAddSplit} disabled={splitsLoading || splitsSaving}>
                    {t("detail.splits.actions.add")}
                  </Button>
                  <Button variant="secondary" onClick={onResetSplits} disabled={splitsLoading || splitsSaving}>
                    {t("detail.splits.actions.reset")}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={onSaveSplits}
                    disabled={splitsLoading || splitsSaving || !splitsDirty || !splitsSum.ok || splitsDelta !== 0}
                  >
                    {splitsSaving ? t("detail.splits.actions.saving") : t("detail.splits.actions.save")}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
                <div className="rounded-xl border border-fh-border bg-fh-surface-2 p-3">
                  <div className="text-xs text-fh-muted">{t("detail.splits.totals.total")}</div>
                  <div className="font-medium">{formatEurFromCents(locale, tx.amountCents)}</div>
                </div>
                <div className="rounded-xl border border-fh-border bg-fh-surface-2 p-3">
                  <div className="text-xs text-fh-muted">{t("detail.splits.totals.sum")}</div>
                  <div className="font-medium">{formatEurFromCents(locale, splitsSum.ok ? splitsSum.sumCents : 0)}</div>
                </div>
                <div className="rounded-xl border border-fh-border bg-fh-surface-2 p-3">
                  <div className="text-xs text-fh-muted">{t("detail.splits.totals.delta")}</div>
                  <div className={cn("font-medium", splitsDelta === 0 ? "" : "text-rose-300")}>
                    {formatEurFromCents(locale, splitsDelta)}
                  </div>
                </div>
              </div>

              {splitsError && (
                <InfoBox variant="danger" title={t("errors.title")}>
                  {splitsError}
                </InfoBox>
              )}
              {splitsSaveError && (
                <InfoBox variant="danger" title={t("errors.title")}>
                  {splitsSaveError}
                </InfoBox>
              )}
              {splitsSaveOk && (
                <InfoBox variant="info" title={t("detail.splits.saveTitle")}>
                  {splitsSaveOk}
                </InfoBox>
              )}

              {splitsLoading ? (
                <div className="text-sm text-fh-muted">{t("detail.splits.loading")}</div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-fh-muted">
                      <tr>
                        <th className="py-2 pr-3">{t("detail.splits.table.category")}</th>
                        <th className="py-2 pr-3">{t("detail.splits.table.amount")}</th>
                        <th className="py-2 pr-3">{t("detail.splits.table.note")}</th>
                        <th className="py-2 pr-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {splitsDraft.length === 0 ? (
                        <tr>
                          <td className="py-3 text-fh-muted" colSpan={4}>
                            {t("detail.splits.empty")}
                          </td>
                        </tr>
                      ) : (
                        splitsDraft.map((r, idx) => {
                          const parsed = parseEurToCents(r.amountEur);
                          const amountErr = parsed.ok ? null : parseErrorLabel(parsed.error);

                          return (
                            <tr key={r.key} className="border-t border-white/5 align-top">
                              <td className="py-2 pr-3">
                                <select
                                  className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
                                  value={r.categoryId ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setSplitsDraft((prev) =>
                                      prev.map((x) => (x.key === r.key ? { ...x, categoryId: v ? v : null } : x))
                                    );
                                    setSplitsSaveOk(null);
                                  }}
                                >
                                  {categoryOptions.map((c) => (
                                    <option key={c.id || "__none"} value={c.id}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td className="py-2 pr-3">
                                <input
                                  className={cn(
                                    "w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm font-mono",
                                    amountErr ? "border-rose-500/60" : ""
                                  )}
                                  value={r.amountEur}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setSplitsDraft((prev) => prev.map((x) => (x.key === r.key ? { ...x, amountEur: v } : x)));
                                    setSplitsSaveOk(null);
                                  }}
                                  placeholder={t("detail.splits.table.amountPlaceholder")}
                                  inputMode="decimal"
                                />
                                {amountErr && <div className="mt-1 text-xs text-rose-300">{t("detail.splits.rowError", { index: idx + 1, error: amountErr })}</div>}
                              </td>

                              <td className="py-2 pr-3">
                                <input
                                  className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
                                  value={r.note}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setSplitsDraft((prev) => prev.map((x) => (x.key === r.key ? { ...x, note: v } : x)));
                                    setSplitsSaveOk(null);
                                  }}
                                  placeholder={t("detail.splits.table.notePlaceholder")}
                                />
                              </td>

                              <td className="py-2 pr-3 text-right">
                                <Button variant="secondary" onClick={() => onRemoveSplit(r.key)} disabled={splitsSaving}>
                                  {t("detail.splits.actions.remove")}
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="space-y-3">
              <div className="text-sm font-semibold">{t("detail.metadata.title")}</div>
              <div className="text-xs text-fh-muted space-y-2">
                <div>
                  {t("detail.metadata.source")}: <span className="font-mono text-fh-text">{tx?.source ?? "-"}</span>
                </div>
                <div>
                  {t("detail.metadata.merchantNorm")}: <span className="font-mono text-fh-text">{tx?.merchantNorm ?? "-"}</span>
                </div>
                <div>
                  {t("detail.metadata.reviewedAt")}: <span className="font-mono text-fh-text">{tx?.reviewedAt ?? "-"}</span>
                </div>
              </div>
            </Card>

            <Card className="space-y-3">
              <div className="text-sm font-semibold">{t("detail.ledger.title")}</div>
              <div className="text-xs text-fh-muted space-y-2">
                <div>
                  {t("detail.ledger.loading")}: <span className="font-mono text-fh-text">{String(loading)}</span>
                </div>
                <div>
                  {t("detail.ledger.month")}: <span className="font-mono text-fh-text">{ledgerMonth ?? "null"}</span>
                </div>
                <div>
                  {t("detail.ledger.count")}: <span className="font-mono text-fh-text">{String(transactions.length)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </Screen>
  );
}
