"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FinancesBurndownChart, type BurndownPoint } from "./FinancesBurndownChart";

type Kpis = {
  balanceEur: number | null;
  incomeEur: number | null;
  expenseEur: number | null;
  netEur: number | null;
};

type Tx = {
  id?: string;
  description?: string;
  merchant?: string;
  category?: string;
  occurredAt?: string;
  date?: string;
  createdAt?: string;
  bookedAt?: string;
  amount?: number;      // eur
  amountCents?: number; // cents
  total?: number;       // eur
  direction?: string;   // income/expense/in/out
  kind?: string;
  type?: string;
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function asRecord(x: unknown): Record<string, unknown> | null {
  return x != null && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
}

function asArray(x: unknown): unknown[] | null {
  return Array.isArray(x) ? x : null;
}

function getStr(r: Record<string, unknown>, key: string): string | undefined {
  const v = r[key];
  return typeof v === "string" ? v : undefined;
}

function getNum(r: Record<string, unknown>, key: string): number | undefined {
  const v = r[key];
  return typeof v === "number" ? v : undefined;
}

function getMaybe(r: Record<string, unknown>, key: string): unknown {
  return r[key];
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function toEurFromPayload(v: unknown): number | null {
  return toNumber(v);
}

function toEurFromCentsMaybe(v: unknown): number | null {
  const n = toNumber(v);
  if (n == null) return null;
  if (Math.abs(n) > 5000) return n / 100;
  return n;
}

function eur(n: number | null | undefined, maxFrac = 0): string {
  const v = Number(n ?? 0);
  try {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: maxFrac }).format(v);
  } catch {
    return `€${Math.round(v)}`;
  }
}

function pickDate(t: Tx): Date | null {
  const raw = t.occurredAt ?? t.date ?? t.createdAt ?? t.bookedAt ?? null;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function pickAmountEur(t: Tx): number | null {
  if (t.amountCents != null) return toEurFromCentsMaybe(t.amountCents);
  if (t.amount != null) return toEurFromPayload(t.amount);
  if (t.total != null) return toEurFromPayload(t.total);
  return null;
}

function signedAmount(t: Tx): number | null {
  const a = pickAmountEur(t);
  if (a == null) return null;

  const dir = (t.direction ?? t.kind ?? t.type ?? "").toString().toLowerCase();
  if (dir.includes("income") || dir === "in") return Math.abs(a);
  if (dir.includes("expense") || dir === "out") return -Math.abs(a);

  return a;
}

function isoDay(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtShortDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function fromUnknownTx(u: unknown): Tx {
  const r = asRecord(u);
  if (!r) return {};
  return {
    id: getStr(r, "id"),
    description: getStr(r, "description"),
    merchant: getStr(r, "merchant"),
    category: getStr(r, "category"),
    occurredAt: getStr(r, "occurredAt"),
    date: getStr(r, "date"),
    createdAt: getStr(r, "createdAt"),
    bookedAt: getStr(r, "bookedAt"),
    amount: getNum(r, "amount"),
    amountCents: getNum(r, "amountCents"),
    total: getNum(r, "total"),
    direction: getStr(r, "direction"),
    kind: getStr(r, "kind"),
    type: getStr(r, "type"),
  };
}

function pickArrayFromResponse(j: unknown): unknown[] | null {
  const r = asRecord(j);
  if (!r) return asArray(j);

  const data = getMaybe(r, "data");
  const transactions = getMaybe(r, "transactions");
  const entries = getMaybe(r, "entries");
  const ledger = getMaybe(r, "ledger");

  return asArray(data) ?? asArray(transactions) ?? asArray(entries) ?? asArray(ledger) ?? asArray(j);
}

function Card({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/60">{title}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-white/45">{hint}</div>}
    </div>
  );
}

function Quick({ href, label, note }: { href: string; label: string; note?: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/7 hover:border-white/15 transition-colors"
    >
      <div className="text-sm font-medium">{label}</div>
      {note && <div className="mt-1 text-xs text-white/60">{note}</div>}
    </Link>
  );
}

export default function FinancesOverviewClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kpis, setKpis] = useState<Kpis>({
    balanceEur: null,
    incomeEur: null,
    expenseEur: null,
    netEur: null,
  });

  const [recent, setRecent] = useState<Tx[]>([]);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        // 1) Bootstrap KPIs
        const r = await fetch("/api/finances/bootstrap", { headers: { accept: "application/json" } });
        if (!r.ok) throw new Error(`bootstrap ${r.status}`);
        const bootstrap: unknown = await r.json();

        const bootRec = asRecord(bootstrap);
        const dataRec = bootRec ? asRecord(getMaybe(bootRec, "data")) : null;
        const root = dataRec ?? bootRec ?? {};

        const balanceEur =
          toEurFromCentsMaybe(getMaybe(root, "balanceCents")) ??
          toEurFromPayload(getMaybe(root, "balanceEur")) ??
          toEurFromPayload(getMaybe(root, "balance")) ??
          null;

        const incomeEur =
          toEurFromCentsMaybe(getMaybe(root, "incomeCents")) ??
          toEurFromPayload(getMaybe(root, "incomeEur")) ??
          toEurFromPayload(getMaybe(root, "income")) ??
          null;

        const expenseEur =
          toEurFromCentsMaybe(getMaybe(root, "expenseCents")) ??
          toEurFromPayload(getMaybe(root, "expenseEur")) ??
          toEurFromPayload(getMaybe(root, "expense")) ??
          null;

        const netEur =
          toEurFromCentsMaybe(getMaybe(root, "netCents")) ??
          toEurFromPayload(getMaybe(root, "netEur")) ??
          toEurFromPayload(getMaybe(root, "net")) ??
          (incomeEur != null && expenseEur != null ? incomeEur - expenseEur : null);

        if (alive) {
          setKpis({ balanceEur, incomeEur, expenseEur, netEur });
        }

        // 2) Recent transactions (primary)
        let txs: unknown[] | null = null;
        try {
          const r2 = await fetch("/api/finances/transactions?limit=8", { headers: { accept: "application/json" } });
          if (!r2.ok) throw new Error(`transactions ${r2.status}`);
          const j2: unknown = await r2.json();
          txs = pickArrayFromResponse(j2);
        } catch {
          txs = null;
        }

        // 3) Fallback: ledger
        if (!txs) {
          try {
            const r3 = await fetch("/api/finances/ledger?limit=8", { headers: { accept: "application/json" } });
            if (!r3.ok) throw new Error(`ledger ${r3.status}`);
            const j3: unknown = await r3.json();
            txs = pickArrayFromResponse(j3) ?? [];
          } catch {
            txs = [];
          }
        }

        const normalized = (txs ?? []).slice(0, 8).map(fromUnknownTx);

        if (alive) {
          setRecent(normalized);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Error cargando datos";
        setError(msg);
        setLoading(false);
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, []);

  const burndownPoints: BurndownPoint[] = useMemo(() => {
    const rows = Array.isArray(recent) ? recent : [];
    const now = new Date();
    const byDay = new Map<string, number>();

    for (const t of rows) {
      const d = pickDate(t);
      if (!d) continue;
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue;

      const s = signedAmount(t);
      if (s == null) continue;

      const day = isoDay(d);
      byDay.set(day, (byDay.get(day) ?? 0) + s);
    }

    const days = Array.from(byDay.keys()).sort();
    let acc = 0;
    return days.map((day) => {
      acc += byDay.get(day) ?? 0;
      return { date: day, value: acc };
    });
  }, [recent]);

  const skeletonRows = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-white/80">
          <div className="font-medium">No se pudo cargar Finanzas</div>
          <div className="mt-1 text-xs text-white/60">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card title="Balance" value={loading ? "…" : eur(kpis.balanceEur)} hint="Saldo estimado" />
            <Card title="Ingresos" value={loading ? "…" : eur(kpis.incomeEur)} hint="Este periodo" />
            <Card title="Gastos" value={loading ? "…" : eur(kpis.expenseEur)} hint="Este periodo" />
            <Card title="Neto" value={loading ? "…" : eur(kpis.netEur)} hint="Ingresos − gastos" />
          </div>

          <FinancesBurndownChart points={burndownPoints} />

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Transacciones recientes</div>
                <div className="text-xs text-white/60">Últimos movimientos</div>
              </div>
              <Link href="/app/finances/transactions" className="text-xs text-white/70 hover:text-white">
                Ver todas
              </Link>
            </div>

            <div className="mt-3 divide-y divide-white/10">
              {loading ? (
                skeletonRows.map((idx) => (
                  <div key={`s-${idx}`} className="py-3 flex items-center justify-between gap-3">
                    <div className="h-3 w-52 bg-white/10 rounded" />
                    <div className="h-3 w-24 bg-white/10 rounded" />
                  </div>
                ))
              ) : (
                recent.map((t, idx) => {
                  const d = pickDate(t);
                  const a = signedAmount(t);
                  const label = (t.description ?? t.merchant ?? "Movimiento").toString();
                  const sub = t.category ? String(t.category) : d ? fmtShortDate(d) : "";

                  return (
                    <div key={t.id ?? `${label}-${idx}`} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm truncate">{label}</div>
                        <div className="text-xs text-white/60 truncate">{sub}</div>
                      </div>
                      <div className={cx("text-sm tabular-nums", (a ?? 0) < 0 ? "text-white/85" : "text-emerald-300")}>
                        {a == null ? "—" : eur(a, 0)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-medium">Accesos rápidos</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <Quick href="/app/finances/transactions/new" label="Nueva transacción" note="Crear un movimiento manual" />
              <Quick href="/app/documents" label="Documentos" note="Ver y subir documentos" />
              <Quick href="/app/documents/ocr-review" label="OCR Review" note="Validar extracciones" />
              <Quick href="/app/cases/new" label="Nuevo caso" note="Iniciar wizard de un caso" />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-medium">Estado</div>
            <div className="mt-2 text-xs text-white/60">
              P0 operativo: KPIs + recientes + chart mensual + quick actions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}