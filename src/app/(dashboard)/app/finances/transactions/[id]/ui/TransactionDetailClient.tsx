"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useFinancesLedger } from "@/features/finances/financesLedgerStore";
import type { FinanceTransactionSplit } from "@/features/finances/financesTypes";
import type { PatchTransaction } from "@/features/finances/financesLedgerApi";

type TxStatus = "pending" | "approved" | "hidden";

function asString(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function isoMonthNow(): string {
  // YYYY-MM
  return new Date().toISOString().slice(0, 7);
}

function isTxStatus(x: unknown): x is TxStatus {
  return x === "pending" || x === "approved" || x === "hidden";
}

function formatEurFromCents(cents: number): string {
  const v = (Number.isFinite(cents) ? cents : 0) / 100;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(v);
}

function normalizeReviewedAt(prevReviewedAt: string | null, nextStatus: TxStatus): string | null {
  if (nextStatus !== "approved") return null;
  return prevReviewedAt ?? new Date().toISOString();
}

export default function TransactionDetailClient() {
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

  // Draft fields
  const [draftStatus, setDraftStatus] = useState<TxStatus>("pending");
  const [draftCategoryId, setDraftCategoryId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  // Load ledger (needed to find tx + categories)
  useEffect(() => {
    if (!month) return;
    if (ledgerMonth === month && transactions.length > 0) return;
    void loadLedger(month);
  }, [month, ledgerMonth, transactions.length, loadLedger]);

  // Sync drafts when tx changes
  useEffect(() => {
    if (!tx) return;
    setDraftStatus(isTxStatus(tx.status) ? tx.status : "pending");
    setDraftCategoryId(tx.categoryId ?? null);
    setDraftNote(tx.note ?? "");
    setSaveError(null);
    setSaveOk(null);
  }, [tx]);

  // Load splits
  useEffect(() => {
    if (!id) return;
    setSplits([]);
    setSplitsError(null);

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
              : `Error cargando splits (${res.status})`;
          throw new Error(msg);
        }

        const arr = Array.isArray(jsonUnknown) ? jsonUnknown : [];
        const parsed: FinanceTransactionSplit[] = arr
          .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
          .filter((x): x is Record<string, unknown> => !!x)
          .map((x) => ({
            id: asString(x.id),
            userId: "", // no lo necesitamos en UI
            transactionId: asString(x.transactionId),
            categoryId: typeof x.categoryId === "string" ? x.categoryId : null,
            splitAmountCents: Number(x.splitAmountCents ?? 0),
            note: typeof x.note === "string" ? x.note : null,
            createdAt: "",
            updatedAt: "",
          }));

        setSplits(parsed);
      } catch (e: unknown) {
        setSplitsError(e instanceof Error ? e.message : "Error cargando splits");
      } finally {
        setSplitsLoading(false);
      }
    };

    void run();
  }, [id]);

  const categoryOptions = useMemo(() => {
    const base = [{ id: "", label: "Sin categoría" }];
    const mapped = (categories ?? [])
      .filter((c) => typeof c.id === "string" && c.id.length > 0)
      .map((c) => ({ id: c.id, label: c.label || c.key || c.id }));
    return [...base, ...mapped];
  }, [categories]);

  const dirty = useMemo(() => {
    if (!tx) return false;
    const s0: TxStatus = isTxStatus(tx.status) ? tx.status : "pending";
    const c0 = tx.categoryId ?? null;
    const n0 = tx.note ?? "";
    return draftStatus !== s0 || (draftCategoryId ?? null) !== c0 || draftNote !== n0;
  }, [tx, draftStatus, draftCategoryId, draftNote]);

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

      // patchTx ya hace optimistic + rollback y persiste con patchTransaction()
      await patchTx(tx.id, patch);

      setSaveOk("Guardado.");
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Error guardando");
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return (
      <div className="p-6">
        <div className="text-sm opacity-80">ID inválido.</div>
        <Link className="underline text-sm" href="/app/finances/transactions">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs opacity-70">Finanzas · Transacciones</div>
          <h1 className="text-xl font-semibold">Detalle</h1>
          <div className="text-xs opacity-70">
            Mes: <span className="font-mono">{month}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link className="underline text-sm self-center" href={`/app/finances/transactions?month=${encodeURIComponent(month)}`}>
            Volver al listado
          </Link>
          <button
            className="px-3 py-2 rounded-md border text-sm disabled:opacity-50"
            disabled={!tx || !dirty || saving}
            onClick={onSave}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {(ledgerError || saveError) && (
        <div className="p-3 rounded-md border border-red-500/40 bg-red-500/10 text-sm">
          {saveError ?? ledgerError}
        </div>
      )}

      {saveOk && <div className="p-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-sm">{saveOk}</div>}

      {!tx ? (
        <div className="p-4 rounded-md border">
          <div className="text-sm font-medium">No se encontró la transacción en este mes.</div>
          <div className="text-xs opacity-70 mt-1">
            Si entraste directo por URL, abre el listado y navega desde ahí (así el mes y el ledger quedan alineados).
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex justify-between gap-4">
                <div>
                  <div className="text-xs opacity-70">Merchant</div>
                  <div className="font-medium">{tx.merchantName}</div>
                  <div className="text-xs opacity-70 font-mono">{tx.id}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-70">Importe</div>
                  <div className="text-lg font-semibold">{formatEurFromCents(tx.amountCents)}</div>
                  <div className="text-xs opacity-70">{tx.currency}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs opacity-70 mb-1">Fecha</div>
                  <div className="font-mono text-sm">{tx.occurredOn}</div>
                </div>

                <div>
                  <label className="text-xs opacity-70 block mb-1">Estado</label>
                  <select
                    className="w-full border rounded-md px-2 py-2 text-sm bg-transparent"
                    value={draftStatus}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraftStatus(isTxStatus(v) ? v : "pending");
                      setSaveOk(null);
                    }}
                  >
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="hidden">hidden</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs opacity-70 block mb-1">Categoría</label>
                  <select
                    className="w-full border rounded-md px-2 py-2 text-sm bg-transparent"
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
                <label className="text-xs opacity-70 block mb-1">Nota</label>
                <textarea
                  className="w-full border rounded-md px-2 py-2 text-sm bg-transparent min-h-[96px]"
                  value={draftNote}
                  onChange={(e) => {
                    setDraftNote(e.target.value);
                    setSaveOk(null);
                  }}
                  placeholder="Opcional…"
                />
              </div>

              <div className="text-xs opacity-70">
                reviewedAt: <span className="font-mono">{tx.reviewedAt ?? "null"}</span>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Splits</div>
                <div className="text-xs opacity-70">Read-only (P0)</div>
              </div>

              {splitsError && (
                <div className="mt-3 p-3 rounded-md border border-red-500/40 bg-red-500/10 text-sm">{splitsError}</div>
              )}

              {splitsLoading ? (
                <div className="mt-3 text-sm opacity-70">Cargando splits…</div>
              ) : (
                <div className="mt-3 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left opacity-70">
                      <tr>
                        <th className="py-2 pr-3">Categoría</th>
                        <th className="py-2 pr-3">Importe</th>
                        <th className="py-2 pr-3">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(splits ?? []).length === 0 ? (
                        <tr>
                          <td className="py-3 opacity-70" colSpan={3}>
                            Sin splits.
                          </td>
                        </tr>
                      ) : (
                        splits.map((s) => (
                          <tr key={s.id} className="border-t">
                            <td className="py-2 pr-3">
                              {s.categoryId
                                ? categoryOptions.find((c) => c.id === s.categoryId)?.label ?? s.categoryId
                                : "Sin categoría"}
                            </td>
                            <td className="py-2 pr-3 font-mono">{formatEurFromCents(s.splitAmountCents)}</td>
                            <td className="py-2 pr-3">{s.note ?? ""}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-md border p-4">
              <div className="font-medium">Metadata</div>
              <div className="mt-2 text-xs opacity-70 space-y-1">
                <div>
                  source: <span className="font-mono">{tx?.source ?? "-"}</span>
                </div>
                <div>
                  merchantNorm: <span className="font-mono">{tx?.merchantNorm ?? "-"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="font-medium">Estado del ledger</div>
              <div className="mt-2 text-xs opacity-70 space-y-1">
                <div>
                  loading: <span className="font-mono">{String(loading)}</span>
                </div>
                <div>
                  ledgerMonth: <span className="font-mono">{ledgerMonth ?? "null"}</span>
                </div>
                <div>
                  txCount: <span className="font-mono">{String(transactions.length)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="font-medium">Acciones</div>
              <div className="mt-2 text-sm">
                <button
                  className="w-full px-3 py-2 rounded-md border text-sm disabled:opacity-50"
                  disabled={!tx || !dirty || saving}
                  onClick={onSave}
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
                <div className="mt-2 text-xs opacity-70">
                  P0: editamos status/category/note. Splits quedan read-only.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}