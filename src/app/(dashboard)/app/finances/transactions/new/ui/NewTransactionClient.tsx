"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { useFinancesLedger } from "@/features/finances/financesLedgerStore";
import { createTransaction, type CreateTransactionInput } from "@/features/finances/financesLedgerApi";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { cn } from "@/ui/cn";

type FormState = {
  occurredOn: string; // YYYY-MM-DD
  merchantName: string;
  amountEur: string; // user input
  categoryId: string; // "" => null
  note: string;
};

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoMonthFromDate(yyyyMmDd: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd) ? yyyyMmDd.slice(0, 7) : new Date().toISOString().slice(0, 7);
}

function eurToCents(input: string): number {
  const s = input.trim().replace(",", ".");
  if (!s) return 0;
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toMonthLabel(locale: string, month: string): string {
  const [year, monthStr] = month.split("-");
  const y = Number(year);
  const m = Number(monthStr);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return month;
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

export default function NewTransactionClient() {
  const t = useTranslations("finances.newTransaction");
  const locale = useLocale();
  const router = useRouter();
  const sp = useSearchParams();

  const monthFromQuery = sp.get("month") ?? "";
  const defaultMonth = monthFromQuery || new Date().toISOString().slice(0, 7);
  const monthLabel = useMemo(() => toMonthLabel(locale, defaultMonth), [locale, defaultMonth]);

  const loadLedger = useFinancesLedger((s) => s.load);
  const categories = useFinancesLedger((s) => s.categories);
  const ledgerMonth = useFinancesLedger((s) => s.month);
  const ledgerError = useFinancesLedger((s) => s.error);

  const [form, setForm] = useState<FormState>(() => ({
    occurredOn: isoToday(),
    merchantName: "",
    amountEur: "",
    categoryId: "",
    note: "",
  }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (ledgerMonth === defaultMonth && (categories?.length ?? 0) > 0) return;
    void loadLedger(defaultMonth);
  }, [defaultMonth, ledgerMonth, categories?.length, loadLedger]);

  const categoryOptions = useMemo(() => {
    const base = [{ id: "", label: t("form.category.none") }];
    const mapped = (categories ?? [])
      .filter((c) => typeof c.id === "string" && c.id.length > 0)
      .map((c) => ({ id: c.id, label: c.label || c.key || c.id }));
    return [...base, ...mapped];
  }, [categories, t]);

  const amountCents = useMemo(() => eurToCents(form.amountEur), [form.amountEur]);

  const canSubmit = useMemo(() => {
    if (!isIsoDate(form.occurredOn)) return false;
    if (!form.merchantName.trim()) return false;
    if (!Number.isFinite(amountCents) || amountCents === 0) return false;
    return true;
  }, [form.occurredOn, form.merchantName, amountCents]);

  const dateError = !isIsoDate(form.occurredOn) ? t("form.date.error") : null;
  const merchantError = !form.merchantName.trim() ? t("form.merchant.error") : null;
  const amountError = !Number.isFinite(amountCents) || amountCents === 0 ? t("form.amount.error") : null;

  const onSubmit = async () => {
    setAttempted(true);
    if (!canSubmit) return;

    setSaving(true);
    setError(null);

    try {
      const input: CreateTransactionInput = {
        occurredOn: form.occurredOn,
        merchantName: form.merchantName.trim(),
        categoryId: form.categoryId ? form.categoryId : null,
        amountCents,
        note: form.note.trim() ? form.note.trim() : null,
      };

      const created = await createTransaction(input);
      const month = isoMonthFromDate(created.occurredOn);
      router.push(`/app/finances/transactions/${encodeURIComponent(created.id)}?month=${encodeURIComponent(month)}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.create"));
    } finally {
      setSaving(false);
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
            <Link className="hover:text-fh-text" href="/app/finances/transactions">
              {t("breadcrumbs.transactions")}
            </Link>
            <span className="mx-2 text-white/20">/</span>
            <span>{t("breadcrumbs.new")}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <div className="text-xs text-fh-muted">{t("monthLabel", { month: monthLabel })}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center justify-center rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm font-medium text-fh-text hover:bg-fh-surface-2"
            href={`/app/finances/transactions?month=${encodeURIComponent(defaultMonth)}`}
          >
            {t("actions.backToList")}
          </Link>
          <Button disabled={!canSubmit || saving} onClick={onSubmit}>
            {saving ? t("actions.creating") : t("actions.create")}
          </Button>
        </div>
      </div>

      {(error || ledgerError) && (
        <InfoBox variant="danger" title={t("errors.title")}>
          {error ?? ledgerError}
        </InfoBox>
      )}

      <Card className="max-w-3xl space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-fh-muted">{t("form.date.label")}</label>
            <input
              className={cn(
                "mt-2 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm font-mono",
                attempted && dateError ? "border-rose-500/60" : ""
              )}
              type="date"
              value={form.occurredOn}
              onChange={(e) => setForm((p) => ({ ...p, occurredOn: e.target.value }))}
              placeholder={t("form.date.placeholder")}
            />
            <div className={cn("mt-2 text-xs text-fh-muted", attempted && dateError ? "text-rose-300" : "")}>
              {attempted && dateError ? dateError : t("form.date.helper")}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-fh-muted">{t("form.merchant.label")}</label>
            <input
              className={cn(
                "mt-2 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm",
                attempted && merchantError ? "border-rose-500/60" : ""
              )}
              value={form.merchantName}
              onChange={(e) => setForm((p) => ({ ...p, merchantName: e.target.value }))}
              placeholder={t("form.merchant.placeholder")}
            />
            <div className={cn("mt-2 text-xs text-fh-muted", attempted && merchantError ? "text-rose-300" : "")}>
              {attempted && merchantError ? merchantError : t("form.merchant.helper")}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-fh-muted">{t("form.amount.label")}</label>
            <input
              className={cn(
                "mt-2 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm font-mono",
                attempted && amountError ? "border-rose-500/60" : ""
              )}
              value={form.amountEur}
              onChange={(e) => setForm((p) => ({ ...p, amountEur: e.target.value }))}
              placeholder={t("form.amount.placeholder")}
              inputMode="decimal"
            />
            <div className={cn("mt-2 text-xs text-fh-muted", attempted && amountError ? "text-rose-300" : "")}>
              {attempted && amountError ? amountError : t("form.amount.helper")}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-fh-muted">{t("form.category.label")}</label>
            <select
              className="mt-2 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
              value={form.categoryId}
              onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
            >
              {categoryOptions.map((c) => (
                <option key={c.id || "__none"} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-fh-muted">{t("form.category.helper")}</div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-fh-muted">{t("form.note.label")}</label>
          <textarea
            className="mt-2 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm min-h-[120px]"
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            placeholder={t("form.note.placeholder")}
          />
          <div className="mt-2 text-xs text-fh-muted">{t("form.note.helper")}</div>
        </div>
      </Card>
    </Screen>
  );
}
