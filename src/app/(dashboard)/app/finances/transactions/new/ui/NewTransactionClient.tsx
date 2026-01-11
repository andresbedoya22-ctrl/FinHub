"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useFinancesLedger } from "@/features/finances/financesLedgerStore";
import { createTransaction, type CreateTransactionInput } from "@/features/finances/financesLedgerApi";

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

export default function NewTransactionClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const monthFromQuery = sp.get("month") ?? "";
  const defaultMonth = monthFromQuery || new Date().toISOString().slice(0, 7);

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

  useEffect(() => {
    // Cargamos ledger para tener categorías disponibles
    if (ledgerMonth === defaultMonth && (categories?.length ?? 0) > 0) return;
    void loadLedger(defaultMonth);
  }, [defaultMonth, ledgerMonth, categories?.length, loadLedger]);

  const categoryOptions = useMemo(() => {
    const base = [{ id: "", label: "Sin categoría" }];
    const mapped = (categories ?? [])
      .filter((c) => typeof c.id === "string" && c.id.length > 0)
      .map((c) => ({ id: c.id, label: c.label || c.key || c.id }));
    return [...base, ...mapped];
  }, [categories]);

  const amountCents = useMemo(() => eurToCents(form.amountEur), [form.amountEur]);

  const canSubmit = useMemo(() => {
    if (!isIsoDate(form.occurredOn)) return false;
    if (!form.merchantName.trim()) return false;
    if (!Number.isFinite(amountCents) || amountCents === 0) return false;
    return true;
  }, [form.occurredOn, form.merchantName, amountCents]);

  const onSubmit = async () => {
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
      setError(e instanceof Error ? e.message : "Error creando transacción");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs opacity-70">Finanzas · Transacciones</div>
          <h1 className="text-xl font-semibold">Nueva transacción</h1>
          <div className="text-xs opacity-70">
            Mes: <span className="font-mono">{defaultMonth}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link className="underline text-sm self-center" href={`/app/finances/transactions?month=${encodeURIComponent(defaultMonth)}`}>
            Volver al listado
          </Link>
          <button
            className="px-3 py-2 rounded-md border text-sm disabled:opacity-50"
            disabled={!canSubmit || saving}
            onClick={onSubmit}
          >
            {saving ? "Creando..." : "Crear"}
          </button>
        </div>
      </div>

      {(error || ledgerError) && (
        <div className="p-3 rounded-md border border-red-500/40 bg-red-500/10 text-sm">
          {error ?? ledgerError}
        </div>
      )}

      <div className="rounded-md border p-4 space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs opacity-70 block mb-1">Fecha (YYYY-MM-DD)</label>
            <input
              className="w-full border rounded-md px-2 py-2 text-sm bg-transparent font-mono"
              value={form.occurredOn}
              onChange={(e) => setForm((p) => ({ ...p, occurredOn: e.target.value }))}
              placeholder="2026-01-11"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs opacity-70 block mb-1">Merchant</label>
            <input
              className="w-full border rounded-md px-2 py-2 text-sm bg-transparent"
              value={form.merchantName}
              onChange={(e) => setForm((p) => ({ ...p, merchantName: e.target.value }))}
              placeholder="Albert Heijn, NS, Bol.com…"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs opacity-70 block mb-1">Importe (EUR)</label>
            <input
              className="w-full border rounded-md px-2 py-2 text-sm bg-transparent font-mono"
              value={form.amountEur}
              onChange={(e) => setForm((p) => ({ ...p, amountEur: e.target.value }))}
              placeholder="12.34"
            />
            <div className="text-xs opacity-70 mt-1">
              amountCents: <span className="font-mono">{String(amountCents)}</span>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs opacity-70 block mb-1">Categoría</label>
            <select
              className="w-full border rounded-md px-2 py-2 text-sm bg-transparent"
              value={form.categoryId}
              onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
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
          <label className="text-xs opacity-70 block mb-1">Nota</label>
          <textarea
            className="w-full border rounded-md px-2 py-2 text-sm bg-transparent min-h-[96px]"
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            placeholder="Opcional…"
          />
        </div>

        <div className="text-xs opacity-70">
          Validación P0: fecha ISO + merchant no vacío + amount ≠ 0.
        </div>
      </div>
    </div>
  );
}