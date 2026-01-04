"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/ui/components/Badge";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { useCases } from "@/features/cases/casesStore";
import type { FinanceTransaction, FinanceUserPlan } from "@/features/finances/financesTypes";
import { useFinancesBootstrap } from "@/features/finances/financesBootstrapStore";
import { useFinancesLedger } from "@/features/finances/financesLedgerStore";
import { BurndownChart } from "@/features/finances/ui/BurndownChart";
import { CategoryDrawer } from "@/features/finances/ui/CategoryDrawer";
import { CategoryGrid } from "@/features/finances/ui/CategoryGrid";
import { CommandPalette } from "@/features/finances/ui/CommandPalette";
import { SafeToSpendCard } from "@/features/finances/ui/SafeToSpendCard";
import { TransactionsInboxTable } from "@/features/finances/ui/TransactionsInboxTable";
import { buildMockFinancesBundle } from "@/features/finances/ui/mockData";

const DEFAULT_PLAN: FinanceUserPlan = {
  projectedIncomeMonthlyCents: 0,
  fixedBudgets: [
    { id: "fb_rent", label: "Alquiler", monthlyCents: 110000, isActive: true },
    { id: "fb_insurance", label: "Seguros", monthlyCents: 20000, isActive: true },
    { id: "fb_utilities", label: "Servicios", monthlyCents: 18000, isActive: true },
  ],
};

function currentMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function FinancesDashboardClient() {
  const router = useRouter();
  const createCase = useCases((s) => s.createCase);

  type CreateCaseInput = Parameters<typeof createCase>[0];

  const MODULES: Array<{ type: Parameters<typeof createCase>[0]; title: string; subtitle: string; pill: string }> = [
    { type: "toeslag_huur", title: "Toeslagen", subtitle: "Eligibility \u2192 checkout \u2192 docs \u2192 revisi\u00f3n.", pill: "Toeslagen" },
    { type: "tax_ib", title: "IB Aangifte", subtitle: "Intake fiscal para declaraci\u00f3n anual (Box 1/2/3).", pill: "Impuestos" },
    { type: "tax_voorlopige_aanslag", title: "Voorlopige aanslag", subtitle: "Ajuste de pagos anticipados con intake guiado.", pill: "Impuestos" },
    { type: "document_review", title: "Revisi\u00f3n de documentos", subtitle: "Sube documentos y pasa por verificaci\u00f3n / OCR review.", pill: "Documentos" },
  ];

  const loadBootstrap = useFinancesBootstrap((s) => s.load);
  const bootstrapLoading = useFinancesBootstrap((s) => s.loading);
  const bootstrapErr = useFinancesBootstrap((s) => s.error);
  const persistedPlan = useFinancesBootstrap((s) => s.plan);

  const loadLedger = useFinancesLedger((s) => s.load);
  const ledgerLoading = useFinancesLedger((s) => s.loading);
  const ledgerErr = useFinancesLedger((s) => s.error);
  const ledgerMonth = useFinancesLedger((s) => s.month);
  const categories = useFinancesLedger((s) => s.categories);
  const persistedTx = useFinancesLedger((s) => s.transactions);
  const patchTx = useFinancesLedger((s) => s.patchTx);
  const bulkPatch = useFinancesLedger((s) => s.bulkPatch);

  useEffect(() => {
    void loadBootstrap();
    void loadLedger(currentMonth());
  }, [loadBootstrap, loadLedger]);

  const [busyType, setBusyType] = useState<CreateCaseInput | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const mock = useMemo(() => buildMockFinancesBundle(), []);
  const plan = persistedPlan ?? DEFAULT_PLAN;

  const month = ledgerMonth ?? mock.month;
  const transactions: FinanceTransaction[] = useMemo(() => {
    if (persistedTx.length) return persistedTx;
    if (ledgerErr) return mock.transactions;
    return persistedTx;
  }, [persistedTx, ledgerErr, mock.transactions]);

  const effectiveCategories = useMemo(() => {
    if (categories.length) return categories;
    if (ledgerErr) return mock.categories;
    return categories;
  }, [categories, ledgerErr, mock.categories]);

  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [forecastMode, setForecastMode] = useState(false);
  const [forecastExtraOutflowCents, setForecastExtraOutflowCents] = useState(0);
  const [splitTx, setSplitTx] = useState<FinanceTransaction | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openCategory = useMemo(() => {
    if (!openCategoryId) return null;
    return effectiveCategories.find((c) => c.id === openCategoryId) ?? null;
  }, [openCategoryId, effectiveCategories]);

  const drawerTxs = useMemo(() => {
    if (!openCategoryId) return [];
    return transactions
      .filter((t) => t.categoryId === openCategoryId)
      .slice()
      .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))
      .slice(0, 40);
  }, [transactions, openCategoryId]);

  async function launch(type: CreateCaseInput) {
    if (busyType) return;
    setErr(null);
    setBusyType(type);

    try {
      const id = await createCase(type);
      router.push(`/app/cases/${id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido al crear el caso";
      setErr(msg);
      setBusyType(null);
    }
  }

  const paletteActions = [
    { id: "nav_cases", label: "Ir a Casos", hint: "/app/cases", keywords: ["cases", "casos", "historial"], run: () => router.push("/app/cases") },
    { id: "nav_documents", label: "Ir a Documentos", hint: "/app/documents", keywords: ["docs", "documentos", "ocr"], run: () => router.push("/app/documents") },
    { id: "nav_profile", label: "Ir a Perfil", hint: "/app/profile", keywords: ["profile", "perfil"], run: () => router.push("/app/profile") },
    ...MODULES.map((m) => ({ id: `case_${m.type}`, label: `Iniciar: ${m.title}`, hint: m.subtitle, keywords: [m.pill, m.type], run: () => void launch(m.type) })),
  ];

  return (
    <Screen className="space-y-6">
      <Header
        title="Finanzas"
        subtitle="Command Center (pro): contexto, inbox y accesos a servicios (toeslagen, impuestos, documentos)."
        right={
          <div className="flex items-center gap-2">
            <button onClick={() => setPaletteOpen(true)} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2">
              Ctrl/Cmd+K
            </button>
            <button onClick={() => setForecastMode((v) => !v)} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2">
              Forecast {forecastMode ? "ON" : "OFF"}
            </button>
            <Badge>F11.4.3</Badge>
          </div>
        }
      />

      <Card className="space-y-3">
        <InfoBox title="Accesos (negocio)" variant="info">
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2" href="/app/cases">
              Ver mis casos
            </Link>
            <Link className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2" href="/app/documents">
              Documentos
            </Link>
            <button onClick={() => setPaletteOpen(true)} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2">
              Iniciar servicio (Ctrl/Cmd+K)
            </button>
          </div>
        </InfoBox>

        {bootstrapLoading ? <div className="text-sm text-fh-muted">Cargando plan persistido.</div> : null}
        {bootstrapErr ? <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm">No se pudo cargar persistencia (usando default): {bootstrapErr}</div> : null}

        {ledgerLoading ? <div className="text-sm text-fh-muted">Cargando transacciones (ledger).</div> : null}
        {ledgerErr ? <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm">Ledger no disponible (fallback UI): {ledgerErr}</div> : null}

        {err ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">{err}</div> : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <SafeToSpendCard month={month} transactions={transactions} plan={plan} />
        </div>
        <div className="lg:col-span-3">
          <BurndownChart month={month} transactions={transactions} forecastMode={forecastMode} forecastExtraOutflowCents={forecastExtraOutflowCents} onForecastExtraChange={setForecastExtraOutflowCents} />
        </div>
      </div>

      {transactions.length ? (
        <TransactionsInboxTable
          categories={effectiveCategories}
          transactions={transactions}
          onPatch={(id, patch) => patchTx(id, patch)}
          onBulkPatch={(ids, patch) => bulkPatch(ids, patch)}
          onSplit={(tx) => setSplitTx(tx)}
        />
      ) : (
        <Card className="p-4">
          <div className="text-sm font-semibold">Inbox de transacciones</div>
          <div className="mt-1 text-sm text-fh-muted">AÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºn no hay transacciones en {month}.</div>
        </Card>
      )}

      <CategoryGrid month={month} categories={effectiveCategories} transactions={transactions} onOpenCategory={(id) => setOpenCategoryId(id)} />

      <CategoryDrawer open={openCategoryId !== null} title="Inspector" onClose={() => setOpenCategoryId(null)} category={openCategory} transactions={drawerTxs} />

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} actions={paletteActions} />

      {splitTx ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSplitTx(null)} />
          <div className="absolute left-1/2 top-24 w-[92vw] max-w-[720px] -translate-x-1/2 rounded-2xl border border-fh-border bg-fh-surface p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Dividir transacci\u00f3n</div>
                <div className="text-xs text-fh-muted">{splitTx.merchantName} ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {splitTx.occurredOn}</div>
              </div>
              <button className="rounded-xl border border-fh-border bg-fh-surface px-3 py-1 text-xs hover:bg-fh-surface-2" onClick={() => setSplitTx(null)}>
                Cerrar
              </button>
            </div>
            <div className="mt-4 text-sm text-fh-muted">Persistencia de splits lista vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a API (PUT). Editor completo entra en F11.5.</div>
          </div>
        </div>
      ) : null}
    </Screen>
  );
}