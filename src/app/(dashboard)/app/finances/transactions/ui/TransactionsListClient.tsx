"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useFinancesLedger } from "@/features/finances/financesLedgerStore";
import type { PatchTransaction } from "@/features/finances/financesLedgerApi";

type TxStatus = "pending" | "approved" | "hidden";

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

function formatEurFromCents(cents: number): string {
  const v = (Number.isFinite(cents) ? cents : 0) / 100;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(v);
}

export default function TransactionsListClient() {
  const sp = useSearchParams();

  const monthFromQuery = sp.get("month") ?? "";
  const month = monthFromQuery || isoMonthNow();

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
      setRowError(e instanceof Error ? e.message : "Error actualizando status");
    } finally {
      setRowSavingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs opacity-70">Finanzas · Transacciones</div>
          <h1 className="text-xl font-semibold">Transacciones</h1>
          <div className="text-xs opacity-70">
            Mes: <span className="font-mono">{month}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link className="underline text-sm self-center" href={`/app/finances?month=${encodeURIComponent(month)}`}>
            Volver a Finanzas
          </Link>

          <Link
            className="px-3 py-2 rounded-md border text-sm"
            href={`/app/finances/transactions/new?month=${encodeURIComponent(month)}`}
          >
            Nueva transacción
          </Link>
        </div>
      </div>

      {(error || rowError) && (
        <div className="p-3 rounded-md border border-red-500/40 bg-red-500/10 text-sm">
          {rowError ?? error}
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-medium">Transactions Inbox</div>
          <div className="text-xs opacity-70">{loading ? "Cargando…" : `${transactions.length} items`}</div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>
                <th className="py-2 px-3">Fecha</th>
                <th className="py-2 px-3">Merchant</th>
                <th className="py-2 px-3">Categoría</th>
                <th className="py-2 px-3 text-right">Importe</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>

            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td className="py-6 px-3 opacity-70" colSpan={6}>
                    {loading ? "Cargando transacciones…" : "No hay transacciones para este mes."}
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const status: TxStatus = isTxStatus(t.status) ? t.status : "pending";
                  const catLabel = t.categoryId ? (categoryLabelById.get(t.categoryId) ?? t.categoryId) : "Sin categoría";
                  const saving = rowSavingId === t.id;

                  return (
                    <tr key={t.id} className="border-t hover:bg-white/5">
                      <td className="py-2 px-3 font-mono">{t.occurredOn}</td>
                      <td className="py-2 px-3">{t.merchantName}</td>
                      <td className="py-2 px-3">{catLabel}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatEurFromCents(t.amountCents)}</td>
                      <td className="py-2 px-3">
                        <select
                          className="border rounded-md px-2 py-1 text-sm bg-transparent disabled:opacity-50"
                          value={status}
                          disabled={saving}
                          onChange={(e) => {
                            const v = e.target.value;
                            const next: TxStatus = isTxStatus(v) ? v : "pending";
                            void onQuickStatus(t.id, next);
                          }}
                        >
                          <option value="pending">pending</option>
                          <option value="approved">approved</option>
                          <option value="hidden">hidden</option>
                        </select>
                        {saving && <span className="ml-2 text-xs opacity-70">…</span>}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Link
                          className="underline text-sm"
                          href={`/app/finances/transactions/${encodeURIComponent(t.id)}?month=${encodeURIComponent(month)}`}
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t text-xs opacity-70">
          P0: quick status edit (pending/approved/hidden) + CTA “Nueva transacción”. Para editar categoría/nota/splits, entra al detalle.
        </div>
      </div>
    </div>
  );
}