"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { Button } from "@/ui/components/Button";
import { InfoBox } from "@/ui/components/InfoBox";

type TxStatus = "pending" | "approved" | "hidden";
type TxSource = "manual" | "ocr";

type LedgerCategory = {
  id: string;
  key: string;
  label: string;
};

type LedgerTransaction = {
  id: string;
  occurred_on: string; // YYYY-MM-DD
  merchant_name: string;
  merchant_norm: string;
  category_id: string | null;
  amount_cents: number;
  currency: "EUR";
  status: TxStatus;
  source: TxSource;
  note: string | null;
};

type LedgerResponse = {
  categories: LedgerCategory[];
  transactions: LedgerTransaction[];
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

function normalizeMerchantName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseLedgerResponse(raw: unknown): { ok: true; value: LedgerResponse } | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: "Respuesta inválida (no objeto)." };

  const catUnknown = raw["categories"];
  const txUnknown = raw["transactions"];

  const categories: LedgerCategory[] = Array.isArray(catUnknown)
    ? catUnknown
        .map((x) => (isRecord(x) ? x : null))
        .filter((x): x is Record<string, unknown> => !!x)
        .map((x) => {
          const id = pickString(x, "id") ?? "";
          const key = pickString(x, "key") ?? "";
          const label = pickString(x, "label") ?? key;
          return { id, key, label };
        })
        .filter((c) => isUuid(c.id) && c.key.length > 0)
    : [];

  const transactions: LedgerTransaction[] = Array.isArray(txUnknown)
    ? txUnknown
        .map((x) => (isRecord(x) ? x : null))
        .filter((x): x is Record<string, unknown> => !!x)
        .map((x) => {
          const id = pickString(x, "id") ?? "";
          const occurred_on = pickString(x, "occurred_on") ?? "";
          const merchant_name = pickString(x, "merchant_name") ?? "";
          const merchant_norm = pickString(x, "merchant_norm") ?? normalizeMerchantName(merchant_name);
          const category_id = pickNullableString(x, "category_id");
          const amount_cents = pickNumber(x, "amount_cents") ?? 0;
          const currency = (pickString(x, "currency") ?? "EUR") as "EUR";
          const status = coerceStatus(pickString(x, "status"));
          const source = coerceSource(pickString(x, "source"));
          const note = pickNullableString(x, "note");

          return {
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
          };
        })
        .filter((t) => isUuid(t.id) && /^\d{4}-\d{2}-\d{2}$/.test(t.occurred_on) && t.merchant_name.length > 0)
    : [];

  return { ok: true, value: { categories, transactions } };
}

function formatMoneyEUR(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function currentMonthYYYYMM(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function TransactionsPageClient() {
  const [month, setMonth] = useState<string>(() => currentMonthYYYYMM());
  const [status, setStatus] = useState<"all" | TxStatus>("all");
  const [q, setQ] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<LedgerCategory[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);

  const categoriesById = useMemo(() => {
    const map = new Map<string, LedgerCategory>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return transactions.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (!qq) return true;
      return (
        t.merchant_name.toLowerCase().includes(qq) ||
        t.merchant_norm.toLowerCase().includes(qq) ||
        (t.note ?? "").toLowerCase().includes(qq)
      );
    });
  }, [transactions, status, q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/finances/ledger?month=${encodeURIComponent(month)}`, { method: "GET", cache: "no-store" });
      const unknown = (await res.json().catch(() => null)) as unknown;

      if (!res.ok) {
        const err = isRecord(unknown) ? (unknown as ErrorResponse) : {};
        throw new Error(err.error ?? "No se pudo cargar ledger.");
      }

      const parsed = parseLedgerResponse(unknown);
      if (!parsed.ok) throw new Error(parsed.error);

      setCategories(parsed.value.categories);
      setTransactions(parsed.value.transactions);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setCategories([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <Header
        title="Finanzas — Transacciones"
        subtitle="Listado operativo (ledger) con filtros"
        right={
          <div className="flex items-center gap-3">
            <Link className="underline text-sm" href="/app/finances">
              Volver
            </Link>
          </div>
        }
      />

      {error ? <InfoBox>{error}</InfoBox> : null}

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <div className="text-xs opacity-70">Mes (YYYY-MM)</div>
              <input
                className="rounded-md border p-2 text-sm"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="2026-01"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-xs opacity-70">Status</div>
              <select className="rounded-md border p-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as "all" | TxStatus)}>
                <option value="all">all</option>
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="hidden">hidden</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-xs opacity-70">Buscar</div>
              <input className="rounded-md border p-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="merchant / note" />
            </div>

            <Button disabled={loading} onClick={() => void load()}>
              {loading ? "Cargando..." : "Recargar"}
            </Button>
          </div>

          <div className="text-xs opacity-70">
            items: <b>{filtered.length}</b>
          </div>

          {loading ? (
            <div>Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm opacity-70">Sin transacciones para este filtro.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left">
                  <tr className="border-b">
                    <th className="py-2 pr-2">Fecha</th>
                    <th className="py-2 pr-2">Merchant</th>
                    <th className="py-2 pr-2">Categoría</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2 pr-2">Importe</th>
                    <th className="py-2 pr-2">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const cat = t.category_id ? categoriesById.get(t.category_id) : null;
                    return (
                      <tr key={t.id} className="border-b">
                        <td className="py-2 pr-2 whitespace-nowrap">{t.occurred_on}</td>
                        <td className="py-2 pr-2">{t.merchant_name}</td>
                        <td className="py-2 pr-2">{cat ? cat.label : t.category_id ?? "—"}</td>
                        <td className="py-2 pr-2 whitespace-nowrap">{t.status}</td>
                        <td className="py-2 pr-2 whitespace-nowrap">{formatMoneyEUR(t.amount_cents)}</td>
                        <td className="py-2 pr-2">
                          <Link className="underline" href={`/app/finances/transactions/${encodeURIComponent(t.id)}`}>
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </Screen>
  );
}