"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { Badge } from "@/ui/components/Badge";
import { InfoBox } from "@/ui/components/InfoBox";

import type { CaseType } from "@/features/cases/casesTypes";
import { useCases } from "@/features/cases/casesStore";

import type { FinanceTransaction, FinanceUserPlan } from "@/features/finances/financesTypes";
import { useFinancesBootstrap } from "@/features/finances/financesBootstrapStore";

import { buildMockFinancesBundle } from "@/features/finances/ui/mockData";
import { SafeToSpendCard } from "@/features/finances/ui/SafeToSpendCard";
import { BurndownChart } from "@/features/finances/ui/BurndownChart";
import { TransactionsInboxTable } from "@/features/finances/ui/TransactionsInboxTable";
import { CategoryGrid } from "@/features/finances/ui/CategoryGrid";
import { CategoryDrawer } from "@/features/finances/ui/CategoryDrawer";
import { CommandPalette } from "@/features/finances/ui/CommandPalette";

type Module = {
  type: CaseType;
  title: string;
  subtitle: string;
  pill: string;
};

const MODULES: Module[] = [
  { type: "finances_intake", title: "Finanzas (intake)", subtitle: "Onboarding financiero: ingresos, gastos, cuentas y objetivos.", pill: "Finanzas" },

  { type: "toeslag_huur", title: "Huurtoeslag", subtitle: "Chequeo de elegibilidad y preparación de documentación.", pill: "Toeslagen" },
  { type: "toeslag_zorg", title: "Zorgtoeslag", subtitle: "Evaluación rápida y checklist de documentos.", pill: "Toeslagen" },
  { type: "toeslag_kinderopvang", title: "Kinderopvangtoeslag", subtitle: "Flujo guiado: elegibilidad → docs → revisión.", pill: "Toeslagen" },

  { type: "tax_ib", title: "IB Aangifte", subtitle: "Intake fiscal para declaración anual (Box 1/2/3).", pill: "Impuestos" },
  { type: "tax_voorlopige_aanslag", title: "Voorlopige aanslag", subtitle: "Ajuste de pagos anticipados con intake guiado.", pill: "Impuestos" },

  { type: "document_review", title: "Revisión de documentos", subtitle: "Sube documentos y pasa por verificación / OCR review.", pill: "Documentos" },
];

const DEFAULT_PLAN: FinanceUserPlan = {
  projectedIncomeMonthlyCents: 0,
  fixedBudgets: [
    { id: "fb_rent", label: "Alquiler", monthlyCents: 110000, isActive: true },
    { id: "fb_insurance", label: "Seguros", monthlyCents: 20000, isActive: true },
    { id: "fb_utilities", label: "Servicios", monthlyCents: 18000, isActive: true },
  ],
};

export default function FinancesDashboardClient() {
  const router = useRouter();
  const createCase = useCases((s) => s.createCase);

  const loadBootstrap = useFinancesBootstrap((s) => s.load);
  const bootstrapLoading = useFinancesBootstrap((s) => s.loading);
  const bootstrapErr = useFinancesBootstrap((s) => s.error);
  const persistedPlan = useFinancesBootstrap((s) => s.plan);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  const [busyType, setBusyType] = useState<CaseType | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const mock = useMemo(() => buildMockFinancesBundle(), []);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(mock.transactions);

  const plan = persistedPlan ?? DEFAULT_PLAN;

  // Drawer
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  // Forecast mode
  const [forecastMode, setForecastMode] = useState(false);
  const [forecastExtraOutflowCents, setForecastExtraOutflowCents] = useState(0);

  // Split modal (mock)
  const [splitTx, setSplitTx] = useState<FinanceTransaction | null>(null);

  // Command palette
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openCategory = useMemo(() => {
    if (!openCategoryId) return null;
    return mock.categories.find((c) => c.id === openCategoryId) ?? null;
  }, [openCategoryId, mock.categories]);

  const drawerTxs = useMemo(() => {
    if (!openCategoryId) return [];
    return transactions
      .filter((t) => t.categoryId === openCategoryId)
      .slice()
      .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))
      .slice(0, 40);
  }, [transactions, openCategoryId]);

  async function launch(type: CaseType) {
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
    {
      id: "nav_cases",
      label: "Ir a Casos",
      hint: "/app/cases",
      keywords: ["cases", "casos", "historial"],
      run: () => router.push("/app/cases"),
    },
    {
      id: "nav_documents",
      label: "Ir a Documentos",
      hint: "/app/documents",
      keywords: ["docs", "documentos", "ocr"],
      run: () => router.push("/app/documents"),
    },
    {
      id: "nav_profile",
      label: "Ir a Perfil",
      hint: "/app/profile",
      keywords: ["profile", "perfil"],
      run: () => router.push("/app/profile"),
    },
    ...MODULES.map((m) => ({
      id: `case_${m.type}`,
      label: `Iniciar: ${m.title}`,
      hint: m.subtitle,
      keywords: [m.pill, m.type],
      run: () => void launch(m.type),
    })),
  ];

  function openSplit(tx: FinanceTransaction) {
    setSplitTx(tx);
  }

  function closeSplit() {
    setSplitTx(null);
  }

  return (
    <Screen className="space-y-6">
      <Header
        title="Finanzas"
        subtitle="Command Center (pro): contexto, inbox y accesos a servicios (toeslagen, impuestos, documentos)."
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              Ctrl/Cmd+K
            </button>
            <button
              onClick={() => setForecastMode((v) => !v)}
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              Forecast {forecastMode ? "ON" : "OFF"}
            </button>
            <Badge>F11.4.2</Badge>
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
            <button
              onClick={() => setPaletteOpen(true)}
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              Iniciar servicio (Ctrl/Cmd+K)
            </button>
          </div>
        </InfoBox>

        {bootstrapLoading ? (
          <div className="text-sm text-fh-muted">Cargando plan persistido…</div>
        ) : null}

        {bootstrapErr ? (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm">
            No se pudo cargar persistencia (usando default): {bootstrapErr}
          </div>
        ) : null}

        {err ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
            {err}
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <SafeToSpendCard month={mock.month} transactions={transactions} plan={plan} />
        </div>
        <div className="lg:col-span-3">
          <BurndownChart
            month={mock.month}
            transactions={transactions}
            forecastMode={forecastMode}
            forecastExtraOutflowCents={forecastExtraOutflowCents}
            onForecastExtraChange={setForecastExtraOutflowCents}
          />
        </div>
      </div>

      <TransactionsInboxTable
        categories={mock.categories}
        transactions={transactions}
        onChange={setTransactions}
        onSplit={openSplit}
      />

      <CategoryGrid
        month={mock.month}
        categories={mock.categories}
        transactions={transactions}
        onOpenCategory={(id) => setOpenCategoryId(id)}
      />

      <CategoryDrawer
        open={openCategoryId !== null}
        title="Inspector"
        onClose={() => setOpenCategoryId(null)}
        category={openCategory}
        transactions={drawerTxs}
      />

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} actions={paletteActions} />

      {splitTx ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeSplit} />
          <div className="absolute left-1/2 top-24 w-[92vw] max-w-[720px] -translate-x-1/2 rounded-2xl border border-fh-border bg-fh-surface p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Dividir transacción</div>
                <div className="text-xs text-fh-muted">
                  {splitTx.merchantName} · {splitTx.occurredOn}
                </div>
              </div>
              <button
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-1 text-xs hover:bg-fh-surface-2"
                onClick={closeSplit}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 text-sm text-fh-muted">
              Split editor completo entra en F11.5 (persistencia de transactions/splits). En UI ya está el entrypoint y la UX base.
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl border border-fh-border bg-fh-surface px-4 py-2 text-sm hover:bg-fh-surface-2"
                onClick={closeSplit}
              >
                Cancelar
              </button>
              <button
                className="rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95"
                onClick={() => closeSplit()}
              >
                Guardar (mock)
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Screen>
  );
}