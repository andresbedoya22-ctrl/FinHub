"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FinancesBurndownChart, type BurndownPoint } from "./FinancesBurndownChart";

type TxRow = Record<string, unknown>;
type BootRow = Record<string, unknown>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function pickString(r: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

function pickNumber(r: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

function moneyFrom(
  r: Record<string, unknown>,
  centsKeys: string[],
  eurKeys: string[],
): number | null {
  const cents = pickNumber(r, centsKeys);
  if (cents != null) return cents / 100;
  return pickNumber(r, eurKeys);
}

function formatEUR(n: number | null, opts?: { max0?: boolean }): string {
  if (n == null) return "—";
  const maximumFractionDigits = opts?.max0 ? 0 : 2;
  try {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits,
    }).format(n);
  } catch {
    const v = maximumFractionDigits === 0 ? Math.round(n) : Math.round(n * 100) / 100;
    return `€${v}`;
  }
}

function shortDay(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

function readTxList(json: unknown): TxRow[] {
  if (Array.isArray(json)) return json.filter(isRecord) as TxRow[];
  if (!isRecord(json)) return [];
  const candidates: unknown[] = [
    ...(asArray(json.transactions)),
    ...(asArray(json.items)),
    ...(asArray(json.data)),
    ...(asArray(json.ledger)),
    ...(asArray(json.rows)),
  ];
  return candidates.filter(isRecord) as TxRow[];
}

function readBoot(json: unknown): BootRow | null {
  if (!isRecord(json)) return null;
  // a veces viene anidado
  const nested = json.bootstrap;
  if (isRecord(nested)) return nested;
  return json;
}

function txDateIso(t: TxRow): string | null {
  const raw = pickString(t, ["occurredAt", "date", "createdAt", "bookedAt", "timestamp"]);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function txAmountEur(t: TxRow): number | null {
  const cents = pickNumber(t, ["amountCents", "totalCents", "valueCents"]);
  if (cents != null) return cents / 100;
  return pickNumber(t, ["amount", "total", "value", "eurAmount"]);
}

function txSignedAmount(t: TxRow): number | null {
  const amt = txAmountEur(t);
  if (amt == null || Number.isNaN(amt)) return null;

  // si ya viene con signo, respétalo
  if (amt < 0) return amt;

  const dir = (pickString(t, ["direction", "kind", "type", "flow"]) ?? "").toLowerCase();
  if (dir.includes("income") || dir === "in" || dir.includes("credit")) return Math.abs(amt);
  if (dir.includes("expense") || dir === "out" || dir.includes("debit")) return -Math.abs(amt);

  return amt;
}

function txMerchant(t: TxRow): string {
  return (
    pickString(t, ["merchant", "counterparty", "name", "description", "memo"]) ??
    "—"
  );
}

function txCategory(t: TxRow): string {
  return (
    pickString(t, ["category", "categoryName", "category_key", "bucket"]) ??
    "Sin categoría"
  );
}

function txStatus(t: TxRow): string {
  return (pickString(t, ["status", "state"]) ?? "OK").toString();
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function pct(x: number): number {
  return Math.round(clamp01(x) * 100);
}

const BUDGET_KEY = "finances.budgets.v1";

function loadBudgetsSafe(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = v;
      if (typeof v === "string" && v.trim() && Number.isFinite(Number(v)) && Number(v) >= 0) out[k] = Number(v);
    }
    return out;
  } catch {
    return {};
  }
}

function saveBudgetsSafe(b: Record<string, number>) {
  try {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(b));
  } catch {
    // ignore
  }
}

function Card({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{title}</div>
          {subtitle ? <div className="text-xs text-white/60 truncate">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  bar,
}: {
  label: string;
  value: string;
  hint?: string;
  bar?: { value: number; label?: string };
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/55">{hint}</div> : null}
      {bar ? (
        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-emerald-500/90"
              style={{ width: `${Math.max(0, Math.min(100, bar.value))}%` }}
            />
          </div>
          {bar.label ? <div className="mt-1 text-[11px] text-white/45">{bar.label}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

export default function FinancesOverviewProClient() {
  const [boot, setBoot] = useState<BootRow | null>(null);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [budgets, setBudgets] = useState<Record<string, number>>({});

  useEffect(() => {
    setBudgets(loadBudgetsSafe());
  }, []);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErr(null);

      try {
        const r1 = await fetch("/api/finances/bootstrap", { headers: { accept: "application/json" } });
        const j1: unknown = await r1.json().catch(() => null);
        const bootRow = readBoot(j1);
        if (alive) setBoot(bootRow);

        // transacciones recientes (fallback ledger)
        const r2 = await fetch("/api/finances/transactions?limit=8", { headers: { accept: "application/json" } });
        if (r2.ok) {
          const j2: unknown = await r2.json().catch(() => null);
          const list = readTxList(j2);
          if (alive) setTxs(list);
        } else {
          const r3 = await fetch("/api/finances/ledger?limit=8", { headers: { accept: "application/json" } });
          const j3: unknown = await r3.json().catch(() => null);
          const list = readTxList(j3);
          if (alive) setTxs(list);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error inesperado";
        if (alive) setErr(msg);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, []);

  const kpis = useMemo(() => {
    const row = boot ?? {};
    const balance = moneyFrom(row, ["balanceCents", "currentBalanceCents"], ["balance", "currentBalance"]);
    const income = moneyFrom(row, ["incomeCents", "inflowCents"], ["income", "inflow"]);
    const expenses = moneyFrom(row, ["expensesCents", "expenseCents", "outflowCents"], ["expenses", "expense", "outflow"]);
    const net =
      moneyFrom(row, ["netCents"], ["net"]) ??
      (income != null && expenses != null ? income - expenses : null);

    const period = pickString(row, ["periodLabel", "period", "monthLabel"]) ?? "Este periodo";

    // bar heurística (solo visual): compara income vs expenses
    const max = Math.max(Math.abs(income ?? 0), Math.abs(expenses ?? 0), 1);
    const incomeBar = income != null ? pct(Math.abs(income) / max) : 0;
    const expBar = expenses != null ? pct(Math.abs(expenses) / max) : 0;

    // “budget usado” = gastos/ingresos (si hay)
    const budgetUsed = income && income > 0 && expenses != null ? Math.min(100, Math.round((expenses / income) * 100)) : null;

    return { balance, income, expenses, net, period, incomeBar, expBar, budgetUsed };
  }, [boot]);

  const burndownPoints: BurndownPoint[] = useMemo(() => {
    const now = new Date();
    const byDay = new Map<string, number>();

    for (const t of txs) {
      const iso = txDateIso(t);
      if (!iso) continue;

      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue;

      const signed = txSignedAmount(t);
      if (signed == null) continue;
      byDay.set(iso, (byDay.get(iso) ?? 0) + signed);
    }

    const days = Array.from(byDay.keys()).sort();
    let acc = 0;
    return days.map((day) => {
      acc += byDay.get(day) ?? 0;
      return { date: day, value: acc };
    });
  }, [txs]);

  const topCategories = useMemo(() => {
    const now = new Date();
    const spend = new Map<string, number>();

    for (const t of txs) {
      const iso = txDateIso(t);
      if (!iso) continue;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue;

      const signed = txSignedAmount(t);
      if (signed == null) continue;
      if (signed >= 0) continue; // solo gasto para budgets

      const cat = txCategory(t);
      spend.set(cat, (spend.get(cat) ?? 0) + Math.abs(signed));
    }

    return Array.from(spend.entries())
      .map(([category, spent]) => ({ category, spent }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 4);
  }, [txs]);

  function updateBudget(category: string, value: number | null) {
    const next: Record<string, number> = { ...budgets };
    if (value == null) {
      delete next[category];
    } else {
      next[category] = value;
    }
    setBudgets(next);
    saveBudgetsSafe(next);
  }

  return (
    <div className="space-y-4">
      {/* Estado */}
      {err ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          Error cargando Finanzas: {err}
        </div>
      ) : null}

      {/* KPI Row (sin card "Navegación") */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-3">
          <Kpi
            label="Balance"
            value={loading ? "—" : formatEUR(kpis.balance, { max0: true })}
            hint="Saldo actual (API)"
          />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <Kpi
            label="Ingresos recibidos"
            value={loading ? "—" : formatEUR(kpis.income, { max0: true })}
            hint={kpis.period}
            bar={kpis.income != null ? { value: kpis.incomeBar, label: "Comparativo del periodo" } : undefined}
          />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <Kpi
            label="Gastos pagados"
            value={loading ? "—" : formatEUR(kpis.expenses, { max0: true })}
            hint={kpis.period}
            bar={kpis.expenses != null ? { value: kpis.expBar, label: "Comparativo del periodo" } : undefined}
          />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <Kpi
            label="Budget usado"
            value={loading ? "—" : kpis.budgetUsed == null ? "—" : `${kpis.budgetUsed}%`}
            hint="Gastos / ingresos (aprox.)"
            bar={kpis.budgetUsed == null ? undefined : { value: kpis.budgetUsed, label: "Mientras no existan budgets reales" }}
          />
        </div>
      </div>

      {/* Acciones rápidas (usable) */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <Card
            title="Acciones rápidas"
            subtitle="Operaciones comunes"
          >
            <div className="flex flex-wrap gap-2">
              <Link
                href="/app/finances/transactions/new"
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                + Nueva transacción
              </Link>
              <Link
                href="/app/finances/transactions"
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                Ver transacciones
              </Link>
              <Link
                href="/app/documents"
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                Documentos
              </Link>
              <Link
                href="/app/documents/ocr-review"
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                OCR Review
              </Link>
              <Link
                href="/app/cases/new"
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                Nuevo caso
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Row: tabla + burndown lateral */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <Card
            title="Transactions Inbox"
            subtitle="Últimos movimientos"
            right={
              <Link href="/app/finances/transactions" className="text-xs text-white/70 hover:text-white">
                View all →
              </Link>
            }
          >
            {loading ? (
              <div className="text-sm text-white/60">Cargando...</div>
            ) : txs.length === 0 ? (
              <div className="text-sm text-white/60">Sin datos aún. Crea tu primera transacción.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-white/60">
                    <tr className="border-b border-white/10">
                      <th className="py-2 text-left font-medium">Date</th>
                      <th className="py-2 text-left font-medium">Merchant</th>
                      <th className="py-2 text-left font-medium">Category</th>
                      <th className="py-2 text-right font-medium">Amount</th>
                      <th className="py-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((t, idx) => {
                      const id = pickString(t, ["id", "transactionId", "uuid"]);
                      const dateIso = txDateIso(t) ?? "—";
                      const merchant = txMerchant(t);
                      const category = txCategory(t);
                      const status = txStatus(t);
                      const amt = txSignedAmount(t);
                      const amtStr = amt == null ? "—" : formatEUR(amt, { max0: false });

                      const Row = (
                        <tr key={`${id ?? "row"}-${idx}`} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2 pr-2 text-white/80">{typeof dateIso === "string" && dateIso.includes("-") ? shortDay(dateIso) : dateIso}</td>
                          <td className="py-2 pr-2 text-white/90">{merchant}</td>
                          <td className="py-2 pr-2">
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/80">
                              {category}
                            </span>
                          </td>
                          <td className="py-2 pl-2 text-right tabular-nums text-white/90">{amtStr}</td>
                          <td className="py-2 pl-2 text-right">
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">
                              {status}
                            </span>
                          </td>
                        </tr>
                      );

                      return id ? (
                        <Link
                          key={`${id}-${idx}`}
                          href={`/app/finances/transactions/${id}`}
                          className="contents"
                        >
                          {Row}
                        </Link>
                      ) : (
                        Row
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <FinancesBurndownChart points={burndownPoints} height={260} />
        </div>
      </div>

      {/* Bottom Row: budgets por categoría (editable localStorage) */}
      <div className="grid grid-cols-12 gap-4">
        {(topCategories.length ? topCategories : [
          { category: "Groceries", spent: 0 },
          { category: "Transport", spent: 0 },
          { category: "Entertainment", spent: 0 },
          { category: "Utilities", spent: 0 },
        ]).map((c) => {
          const stored = budgets[c.category];
          const suggested = c.spent > 0 ? Math.ceil((c.spent * 1.25) / 10) * 10 : 0;
          const limit = stored != null ? stored : suggested;
          const ratio = limit > 0 ? c.spent / limit : 0;
          const risk = limit > 0 && ratio >= 0.9 ? "Overspending risk" : "OK";

          return (
            <div key={c.category} className="col-span-12 md:col-span-6 lg:col-span-3">
              <Card title={c.category} subtitle={`${formatEUR(c.spent, { max0: true })} / ${limit ? formatEUR(limit, { max0: true }) : "—"}`}>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-emerald-500/90"
                    style={{ width: `${pct(ratio)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-white/55">{risk}</div>
                  <div className="text-xs text-white/55">{limit > 0 ? `${pct(ratio)}%` : "—"}</div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-white/60">Límite (editable)</label>
                  <input
                    inputMode="numeric"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    value={limit === 0 ? "" : String(limit)}
                    placeholder="Ej: 400"
                    onChange={(e) => {
                      const raw = e.target.value.replace(",", ".");
                      if (!raw.trim()) return updateBudget(c.category, null);
                      const v = Number(raw);
                      if (!Number.isFinite(v) || v < 0) return;
                      updateBudget(c.category, v);
                    }}
                  />
                  <div className="mt-1 text-[11px] text-white/45">
                    Se guarda en tu navegador (localStorage).
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}