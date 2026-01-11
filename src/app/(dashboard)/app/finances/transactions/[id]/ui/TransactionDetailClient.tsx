"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { Button } from "@/ui/components/Button";
import { InfoBox } from "@/ui/components/InfoBox";

type TxStatus = "pending" | "approved" | "hidden";
type TxSource = "manual" | "ocr";

type FinanceTransaction = {
  id: string;
  occurred_on: string;
  merchant_name: string;
  merchant_norm: string;
  category_id: string | null;
  amount_cents: number;
  currency: "EUR";
  status: TxStatus;
  source: TxSource;
  note: string | null;
};

type FinanceTransactionSplit = {
  id: string;
  transaction_id: string;
  category_id: string | null;
  split_amount_cents: number;
  note: string | null;
};

type ErrorResponse = { error?: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function isUuid(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
function pickString(o: Record<string, unknown>, k: string): string | null {
  const v = o[k];
  return typeof v === "string" ? v : null;
}
function pickNumber(o: Record<string, unknown>, k: string): number | null {
  const v = o[k];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function pickNullableString(o: Record<string, unknown>, k: string): string | null {
  const v = o[k];
  if (v === null) return null;
  return typeof v === "string" ? v : null;
}
function coerceStatus(s: string | null): TxStatus {
  if (s === "pending" || s === "approved" || s === "hidden") return s;
  return "pending";
}
function coerceSource(s: string | null): TxSource {
  if (s === "manual" || s === "ocr") return s;
  return "manual";
}
function formatMoneyEUR(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function parseTransaction(raw: unknown): { ok: true; value: FinanceTransaction } | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: "Transacción inválida (no objeto)." };

  const id = pickString(raw, "id") ?? "";
  const occurred_on = pickString(raw, "occurred_on") ?? "";
  const merchant_name = pickString(raw, "merchant_name") ?? "";
  const merchant_norm = pickString(raw, "merchant_norm") ?? merchant_name.trim().toLowerCase();
  const category_id = pickNullableString(raw, "category_id");
  const amount_cents = pickNumber(raw, "amount_cents") ?? 0;
  const currency = (pickString(raw, "currency") ?? "EUR") as "EUR";
  const status = coerceStatus(pickString(raw, "status"));
  const source = coerceSource(pickString(raw, "source"));
  const note = pickNullableString(raw, "note");

  if (!isUuid(id)) return { ok: false, error: "Transacción inválida: id no es UUID." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurred_on)) return { ok: false, error: "Transacción inválida: occurred_on." };
  if (!merchant_name) return { ok: false, error: "Transacción inválida: merchant_name vacío." };

  return {
    ok: true,
    value: {
      id,
      occurred_on,
      merchant_name,
      merchant_norm,
      category_id: category_id && isUuid(category_id) ? category_id : null,
      amount_cents,
      currency,
      status,
      source,
      note,
    },
  };
}

function parseSplits(raw: unknown): FinanceTransactionSplit[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => (isRecord(x) ? x : null))
    .filter((x): x is Record<string, unknown> => !!x)
    .map((x) => {
      const id = pickString(x, "id") ?? "";
      const transaction_id = pickString(x, "transaction_id") ?? "";
      const category_id = pickNullableString(x, "category_id");
      const split_amount_cents = pickNumber(x, "split_amount_cents") ?? 0;
      const note = pickNullableString(x, "note");
      return {
        id,
        transaction_id,
        category_id: category_id && isUuid(category_id) ? category_id : null,
        split_amount_cents,
        note,
      };
    })
    .filter((s) => isUuid(s.id) && isUuid(s.transaction_id));
}

export default function TransactionDetailClient() {
  const params = useParams<{ id: string }>();
  const id = (params?.id ?? "").toString();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tx, setTx] = useState<FinanceTransaction | null>(null);
  const [splits, setSplits] = useState<FinanceTransactionSplit[]>([]);

  const splitsTotal = useMemo(() => splits.reduce((acc, s) => acc + s.split_amount_cents, 0), [splits]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const txRes = await fetch(`/api/finances/transactions/${encodeURIComponent(id)}`, { method: "GET", cache: "no-store" });
      const txUnknown = (await txRes.json().catch(() => null)) as unknown;

      if (!txRes.ok) {
        const err = isRecord(txUnknown) ? (txUnknown as ErrorResponse) : {};
        throw new Error(err.error ?? "No se pudo cargar la transacción.");
      }
      const parsedTx = parseTransaction(txUnknown);
      if (!parsedTx.ok) throw new Error(parsedTx.error);
      setTx(parsedTx.value);

      const spRes = await fetch(`/api/finances/transactions/${encodeURIComponent(id)}/splits`, { method: "GET", cache: "no-store" });
      const spUnknown = (await spRes.json().catch(() => null)) as unknown;

      if (!spRes.ok) {
        const err = isRecord(spUnknown) ? (spUnknown as ErrorResponse) : {};
        throw new Error(err.error ?? "No se pudieron cargar splits.");
      }
      setSplits(parseSplits(spUnknown));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setTx(null);
      setSplits([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <Header
        title="Transacción — Detalle"
        subtitle={tx ? `${tx.merchant_name} — ${formatMoneyEUR(tx.amount_cents)} — ${tx.status}` : "Cargando..."}
        right={
          <Link className="underline text-sm" href="/app/finances/transactions">
            Volver
          </Link>
        }
      />

      {error ? <InfoBox>{error}</InfoBox> : null}

      <Card>
        {loading ? (
          <div>Cargando...</div>
        ) : !tx ? (
          <div>No encontrado.</div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <div><span className="opacity-70">ID:</span> {tx.id}</div>
              <div><span className="opacity-70">Fecha:</span> {tx.occurred_on}</div>
              <div><span className="opacity-70">Merchant:</span> {tx.merchant_name}</div>
              <div><span className="opacity-70">Norm:</span> {tx.merchant_norm}</div>
              <div><span className="opacity-70">Category:</span> {tx.category_id ?? "—"}</div>
              <div><span className="opacity-70">Fuente:</span> {tx.source}</div>
              <div><span className="opacity-70">Status:</span> {tx.status}</div>
              <div><span className="opacity-70">Importe:</span> {formatMoneyEUR(tx.amount_cents)}</div>
              <div className="md:col-span-2"><span className="opacity-70">Nota:</span> {tx.note ?? "—"}</div>
            </div>

            <div className="flex items-center gap-2">
              <Button disabled={loading} onClick={() => void load()}>
                Recargar
              </Button>
              <div className="text-xs opacity-70">
                Splits: <b>{splits.length}</b> — total splits: <b>{formatMoneyEUR(splitsTotal)}</b>
              </div>
            </div>

            {splits.length === 0 ? (
              <div className="text-sm opacity-70">Sin splits.</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr className="border-b">
                      <th className="py-2 pr-2">Split ID</th>
                      <th className="py-2 pr-2">Category</th>
                      <th className="py-2 pr-2">Importe</th>
                      <th className="py-2 pr-2">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {splits.map((s) => (
                      <tr key={s.id} className="border-b">
                        <td className="py-2 pr-2 whitespace-nowrap">{s.id}</td>
                        <td className="py-2 pr-2">{s.category_id ?? "—"}</td>
                        <td className="py-2 pr-2 whitespace-nowrap">{formatMoneyEUR(s.split_amount_cents)}</td>
                        <td className="py-2 pr-2">{s.note ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>
    </Screen>
  );
}