"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AnyObj = Record<string, unknown>;

type LoadState<T> =
  | { status: "idle" | "loading"; data?: undefined; error?: undefined }
  | { status: "ready"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: string };

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function asObj(v: unknown): AnyObj | null {
  if (!v || typeof v !== "object") return null;
  return v as AnyObj;
}

function asArr(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

function pickNumber(obj: AnyObj | null, keys: string[]): number | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function eur(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
  } catch {
    return `€${n.toFixed(2)}`;
  }
}

function isoToShort(d: unknown): string {
  if (typeof d !== "string") return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("nl-NL");
}

type TxRow = {
  id: string;
  date?: string;
  description?: string;
  amount?: number;
  currency?: string;
  category?: string;
};

function normalizeTxList(payload: unknown): TxRow[] {
  const root = asObj(payload);
  if (!root) return [];

  const candidates: unknown[] | null =
    asArr(root.items) ??
    asArr(root.data) ??
    asArr(root.transactions) ??
    asArr(root.rows) ??
    asArr(payload);

  if (!candidates) return [];

  const out: TxRow[] = [];
  for (const x of candidates) {
    const o = asObj(x);
    if (!o) continue;

    const id =
      (typeof o.id === "string" && o.id) ||
      (typeof o.txId === "string" && o.txId) ||
      (typeof o.transactionId === "string" && o.transactionId) ||
      "";

    if (!id) continue;

    const amount =
      (typeof o.amount === "number" ? o.amount : undefined) ??
      (typeof o.total === "number" ? o.total : undefined) ??
      (typeof o.value === "number" ? o.value : undefined);

    const currency = (typeof o.currency === "string" ? o.currency : undefined) ?? "EUR";

    out.push({
      id,
      date: typeof o.date === "string" ? o.date : typeof o.bookedAt === "string" ? o.bookedAt : undefined,
      description:
        typeof o.description === "string"
          ? o.description
          : typeof o.merchant === "string"
            ? o.merchant
            : typeof o.name === "string"
              ? o.name
              : undefined,
      amount,
      currency,
      category: typeof o.category === "string" ? o.category : undefined,
    });
  }
  return out.slice(0, 8);
}

type OverviewData = {
  bootstrap: unknown;
  tx: unknown;
};

export default function FinancesOverviewClient() {
  const [state, setState] = useState<LoadState<OverviewData>>({ status: "idle" });

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    async function run() {
      setState({ status: "loading" });

      try {
        // 1) bootstrap (si existe)
        const bootstrapP = fetch("/api/finances/bootstrap", {
          method: "GET",
          signal: ac.signal,
          headers: { "Accept": "application/json" },
        }).then(async (r) => {
          if (!r.ok) throw new Error(`bootstrap ${r.status}`);
          return r.json();
        });

        // 2) transacciones (si existe el endpoint)
        const txP = fetch("/api/finances/transactions?limit=8", {
          method: "GET",
          signal: ac.signal,
          headers: { "Accept": "application/json" },
        }).then(async (r) => {
          if (!r.ok) {
            // fallback: ledger
            const r2 = await fetch("/api/finances/ledger", {
              method: "GET",
              signal: ac.signal,
              headers: { "Accept": "application/json" },
            });
            if (!r2.ok) throw new Error(`transactions ${r.status} / ledger ${r2.status}`);
            return r2.json();
          }
          return r.json();
        });

        const [bootstrap, tx] = await Promise.all([bootstrapP, txP]);

        if (!alive) return;
        setState({ status: "ready", data: { bootstrap, tx } });
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Unknown error";
        setState({ status: "error", error: msg });
      }
    }

    void run();
    return () => {
      alive = false;
      ac.abort();
    };
  }, []);

  const summary = useMemo(() => {
    if (state.status !== "ready") return null;

    const b = asObj(state.data.bootstrap);
    const s = (b && asObj(b.summary)) || b;

    // Intentamos mapear números típicos. Si tu API usa otros nombres, igual cae a "—".
    const income = pickNumber(s, ["income", "totalIncome", "incomes", "incomeMonth", "monthIncome"]);
    const expenses = pickNumber(s, ["expenses", "totalExpenses", "expense", "expensesMonth", "monthExpenses"]);
    const net = pickNumber(s, ["net", "netMonth", "result", "profit", "netResult"]);
    const balance = pickNumber(s, ["balance", "currentBalance", "cash", "available", "availableBalance"]);

    return { income, expenses, net, balance };
  }, [state]);

  const txRows = useMemo(() => {
    if (state.status !== "ready") return [];
    return normalizeTxList(state.data.tx);
  }, [state]);

  return (
    <div className="space-y-6">
      {/* Top row: KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card title="Balance" value={eur(summary?.balance)} subtitle="Saldo actual (según API)" />
        <Card title="Ingresos" value={eur(summary?.income)} subtitle="Mes en curso (si disponible)" />
        <Card title="Gastos" value={eur(summary?.expenses)} subtitle="Mes en curso (si disponible)" />
        <Card title="Neto" value={eur(summary?.net)} subtitle="Resultado (si disponible)" />
      </div>

      {/* Middle: Recent + Quick actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Transacciones recientes</div>
                <div className="text-xs text-white/60">Últimos movimientos (API)</div>
              </div>
              <Link
                href="/app/finances/transactions"
                className="text-xs px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5"
              >
                Ver todas
              </Link>
            </div>

            <div className="p-2">
              {state.status === "loading" || state.status === "idle" ? (
                <Empty> Cargando… </Empty>
              ) : state.status === "error" ? (
                <Empty>
                  Error cargando datos: <span className="text-white/80">{state.error}</span>
                </Empty>
              ) : txRows.length === 0 ? (
                <Empty>Sin datos aún. Crea tu primera transacción.</Empty>
              ) : (
                <div className="divide-y divide-white/10">
                  {txRows.map((t) => (
                    <div key={t.id} className="px-3 py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm truncate">{t.description ?? "Transacción"}</div>
                        <div className="text-xs text-white/55 flex items-center gap-2">
                          <span>{isoToShort(t.date)}</span>
                          {t.category ? <span className="px-2 py-0.5 rounded bg-black/20 border border-white/10">{t.category}</span> : null}
                        </div>
                      </div>
                      <div className={cx("text-sm tabular-nums", typeof t.amount === "number" && t.amount < 0 ? "text-rose-300" : "text-emerald-300")}>
                        {typeof t.amount === "number" ? eur(t.amount) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-white/10 text-xs text-white/50">
              Tip: Cmd/Ctrl+K para acciones rápidas.
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-sm font-semibold">Accesos rápidos</div>
              <div className="text-xs text-white/60">Lo mínimo para usar producto hoy</div>
            </div>
            <div className="p-3 grid grid-cols-1 gap-2">
              <Quick href="/app/finances/transactions/new" label="Nueva transacción" />
              <Quick href="/app/documents" label="Documentos" />
              <Quick href="/app/documents/ocr-review" label="OCR Review" />
              <Quick href="/app/cases/new" label="Nuevo caso" />
            </div>
          </div>

          {state.status === "ready" && process.env.NODE_ENV !== "production" ? (
            <details className="rounded-xl border border-white/10 bg-white/5 backdrop-blur">
              <summary className="px-4 py-3 cursor-pointer text-sm">Debug (dev): payloads</summary>
              <div className="p-3 space-y-3">
                <pre className="text-[11px] whitespace-pre-wrap break-words text-white/70 bg-black/30 border border-white/10 rounded-md p-2">
                  {JSON.stringify(state.data.bootstrap, null, 2)}
                </pre>
                <pre className="text-[11px] whitespace-pre-wrap break-words text-white/70 bg-black/30 border border-white/10 rounded-md p-2">
                  {JSON.stringify(state.data.tx, null, 2)}
                </pre>
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
      <div className="text-xs text-white/60">{title}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-white/50">{subtitle}</div> : null}
    </div>
  );
}

function Quick({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="h-10 px-3 rounded-md border border-white/10 bg-black/20 hover:bg-white/5 flex items-center text-sm">
      {label}
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-6 text-sm text-white/60">{children}</div>;
}