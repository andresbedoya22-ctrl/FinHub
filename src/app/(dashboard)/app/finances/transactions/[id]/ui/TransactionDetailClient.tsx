"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useFinancesLedger } from "@/features/finances/financesLedgerStore";
import type { FinanceTransactionSplit } from "@/features/finances/financesTypes";
import type { PatchTransaction } from "@/features/finances/financesLedgerApi";

type TxStatus = "pending" | "approved" | "hidden";

type SplitDraftRow = {
  key: string; // stable key for rendering
  id: string; // server id or temp id
  categoryId: string | null;
  amountEur: string; // user input (EUR)
  note: string;
};

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

function eurInputFromCents(cents: number): string {
  const v = (Number.isFinite(cents) ? cents : 0) / 100;
  // keep dot decimal for predictable parsing; user can still type comma
  return v.toFixed(2);
}

function parseEurToCents(input: string): { ok: true; cents: number } | { ok: false; error: string } {
  const raw = input.trim().replace(",", ".");
  if (!raw) return { ok: false, error: "Importe requerido" };
  if (!/^-?\d+(\.\d{0,2})?$/.test(raw)) return { ok: false, error: "Formato inválido (usa 12.34)" };

  const parts = raw.split(".");
  const intPart = parts[0] ?? "0";
  const decPart = parts[1] ?? "";

  const sign = intPart.startsWith("-") ? -1 : 1;
  const absInt = Math.abs(Number(intPart));
  if (!Number.isFinite(absInt)) return { ok: false, error: "Número inválido" };

  const dec2 = (decPart + "00").slice(0, 2);
  const dec = Number(dec2);
  if (!Number.isFinite(dec)) return { ok: false, error: "Decimales inválidos" };

  const cents = sign * (absInt * 100 + dec);
  return { ok: true, cents };
}

function normalizeReviewedAt(prevReviewedAt: string | null, nextStatus: TxStatus): string | null {
  if (nextStatus !== "approved") return null;
  return prevReviewedAt ?? new Date().toISOString();
}

function newKey(): string {
  // crypto.randomUUID is available in modern browsers; fallback for safety
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

function normalizeDraftForCompare(rows: SplitDraftRow[]): Array<{ categoryId: string | null; splitAmountCents: number; note: string | null }> | null {
  const out: Array<{ categoryId: string | null; splitAmountCents: number; note: string | null }> = [];
  for (const r of rows) {
    const parsed = parseEurToCents(r.amountEur);
    if (!parsed.ok) return null;
    out.push({
      categoryId: r.categoryId ?? null,
      splitAmountCents: parsed.cents,
      note: r.note.trim() ? r.note.trim() : null,
    });
  }
  return out;
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

  const [splitsDraft, setSplitsDraft] = useState<SplitDraftRow[]>([]);
  const [splitsSaving, setSplitsSaving] = useState(false);
  const [splitsSaveError, setSplitsSaveError] = useState<string | null>(null);
  const [splitsSaveOk, setSplitsSaveOk] = useState<string | null>(null);

  // Draft fields (tx)
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
              : `Error cargando splits (${res.status})`;
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

  const splitsCompareBase = useMemo(() => normalizeDraftForCompare(splitsToDraftRows(splits)), [splits]);
  const splitsCompareDraft = useMemo(() => normalizeDraftForCompare(splitsDraft), [splitsDraft]);

  const splitsDirty = useMemo(() => {
    if (!splitsCompareBase || !splitsCompareDraft) return true; // invalid draft => treat as dirty
    return JSON.stringify(splitsCompareBase) !== JSON.stringify(splitsCompareDraft);
  }, [splitsCompareBase, splitsCompareDraft]);

  const splitsSum = useMemo(() => {
    const norm = normalizeDraftForCompare(splitsDraft);
    if (!norm) return { ok: false as const, sumCents: 0, error: "Hay importes inválidos en splits" };
    const sumCents = norm.reduce((acc, s) => acc + s.splitAmountCents, 0);
    return { ok: true as const, sumCents, norm };
  }, [splitsDraft]);

  const splitsDelta = useMemo(() => {
    if (!tx) return 0;
    const sum = splitsSum.ok ? splitsSum.sumCents : 0;
    return tx.amountCents - sum;
  }, [tx, splitsSum]);

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
      setSaveOk("Guardado.");
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Error guardando");
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
      if (!splitsSum.ok) throw new Error(splitsSum.error);

      const delta = tx.amountCents - splitsSum.sumCents;
      if (delta !== 0) {
        throw new Error(`El total de splits debe cuadrar con el importe. Diferencia: ${formatEurFromCents(delta)}`);
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
            : `Error guardando splits (${res.status})`;
        throw new Error(msg);
      }

      // Expected: { ok: true, splits: [...] }
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
      setSplitsSaveOk("Splits guardados.");
    } catch (e: unknown) {
      setSplitsSaveError(e instanceof Error ? e.message : "Error guardando splits");
    } finally {
      setSplitsSaving(false);
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
          <button className="px-3 py-2 rounded-md border text-sm disabled:opacity-50" disabled={!tx || !dirty || saving} onClick={onSave}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {(ledgerError || saveError) && (
        <div className="p-3 rounded-md border border-red-500/40 bg-red-500/10 text-sm">{saveError ?? ledgerError}</div>
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
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">Splits</div>
                <div className="flex gap-2">
                  <button className="px-3 py-2 rounded-md border text-sm" onClick={onAddSplit} disabled={splitsLoading || splitsSaving}>
                    Añadir split
                  </button>
                  <button className="px-3 py-2 rounded-md border text-sm" onClick={onResetSplits} disabled={splitsLoading || splitsSaving}>
                    Reset
                  </button>
                  <button
                    className="px-3 py-2 rounded-md border text-sm disabled:opacity-50"
                    onClick={onSaveSplits}
                    disabled={splitsLoading || splitsSaving || !splitsDirty || !splitsSum.ok || splitsDelta !== 0}
                  >
                    {splitsSaving ? "Guardando..." : "Guardar splits"}
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-md border p-3">
                  <div className="text-xs opacity-70">Total tx</div>
                  <div className="font-medium">{formatEurFromCents(tx.amountCents)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs opacity-70">Suma splits</div>
                  <div className="font-medium">{formatEurFromCents(splitsSum.ok ? splitsSum.sumCents : 0)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs opacity-70">Diferencia</div>
                  <div className={`font-medium ${splitsDelta === 0 ? "" : "text-red-600"}`}>{formatEurFromCents(splitsDelta)}</div>
                </div>
              </div>

              {splitsError && (
                <div className="mt-3 p-3 rounded-md border border-red-500/40 bg-red-500/10 text-sm">{splitsError}</div>
              )}
              {splitsSaveError && (
                <div className="mt-3 p-3 rounded-md border border-red-500/40 bg-red-500/10 text-sm">{splitsSaveError}</div>
              )}
              {splitsSaveOk && (
                <div className="mt-3 p-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-sm">{splitsSaveOk}</div>
              )}

              {splitsLoading ? (
                <div className="mt-3 text-sm opacity-70">Cargando splits…</div>
              ) : (
                <div className="mt-3 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left opacity-70">
                      <tr>
                        <th className="py-2 pr-3">Categoría</th>
                        <th className="py-2 pr-3">Importe (EUR)</th>
                        <th className="py-2 pr-3">Nota</th>
                        <th className="py-2 pr-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {splitsDraft.length === 0 ? (
                        <tr>
                          <td className="py-3 opacity-70" colSpan={4}>
                            Sin splits. Puedes añadirlos arriba.
                          </td>
                        </tr>
                      ) : (
                        splitsDraft.map((r, idx) => {
                          const parsed = parseEurToCents(r.amountEur);
                          const amountErr = parsed.ok ? null : parsed.error;

                          return (
                            <tr key={r.key} className="border-t align-top">
                              <td className="py-2 pr-3">
                                <select
                                  className="w-full border rounded-md px-2 py-2 text-sm bg-transparent"
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
                                  className="w-full border rounded-md px-2 py-2 text-sm bg-transparent font-mono"
                                  value={r.amountEur}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setSplitsDraft((prev) => prev.map((x) => (x.key === r.key ? { ...x, amountEur: v } : x)));
                                    setSplitsSaveOk(null);
                                  }}
                                  placeholder="Ej: 12.34"
                                  inputMode="decimal"
                                />
                                {amountErr && <div className="text-xs text-red-600 mt-1">{`Fila ${idx + 1}: ${amountErr}`}</div>}
                              </td>

                              <td className="py-2 pr-3">
                                <input
                                  className="w-full border rounded-md px-2 py-2 text-sm bg-transparent"
                                  value={r.note}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setSplitsDraft((prev) => prev.map((x) => (x.key === r.key ? { ...x, note: v } : x)));
                                    setSplitsSaveOk(null);
                                  }}
                                  placeholder="Opcional…"
                                />
                              </td>

                              <td className="py-2 pr-3 text-right">
                                <button
                                  className="px-3 py-2 rounded-md border text-sm"
                                  onClick={() => onRemoveSplit(r.key)}
                                  disabled={splitsSaving}
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <div className="mt-2 text-xs opacity-70">
                    Regla P0: la suma de splits debe cuadrar exactamente con el importe de la transacción para poder guardar.
                  </div>
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
              <div className="font-medium">Opciones</div>
              <div className="mt-2 text-sm space-y-2">
                <button className="w-full px-3 py-2 rounded-md border text-sm disabled:opacity-50" disabled={!tx || !dirty || saving} onClick={onSave}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  className="w-full px-3 py-2 rounded-md border text-sm disabled:opacity-50"
                  disabled={!tx || splitsLoading || splitsSaving || !splitsDirty || !splitsSum.ok || splitsDelta !== 0}
                  onClick={onSaveSplits}
                >
                  {splitsSaving ? "Guardando..." : "Guardar splits"}
                </button>
                <div className="text-xs opacity-70">
                  P0: detalle edita status/category/note y splits. Validación: splits deben cuadrar con importe.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
