"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { Badge } from "@/ui/components/Badge";
import { InfoBox } from "@/ui/components/InfoBox";

import type { CaseType } from "@/features/cases/casesTypes";
import { useCases } from "@/features/cases/casesStore";

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

export default function FinancesDashboardClient() {
  const router = useRouter();
  const createCase = useCases((s) => s.createCase);

  const [busyType, setBusyType] = useState<CaseType | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const byPill = new Map<string, Module[]>();
    for (const m of MODULES) {
      const list = byPill.get(m.pill) ?? [];
      list.push(m);
      byPill.set(m.pill, list);
    }
    return Array.from(byPill.entries());
  }, []);

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

  return (
    <Screen className="space-y-6">
      <Header
        title="Finanzas"
        subtitle="Centro operativo: inicia servicios (toeslagen, impuestos, revisión de documentos) y gestiona tus casos."
        right={<Badge>F10</Badge>}
      />

      <Card className="space-y-3">
        <InfoBox title="Accesos rápidos" variant="info">
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2" href="/app/cases">
              Ver mis casos
            </Link>
            <Link className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2" href="/app/documents">
              Documentos
            </Link>
            <Link className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2" href="/app/cases/new">
              Nuevo caso (selector)
            </Link>
          </div>
        </InfoBox>

        {err ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
            {err}
          </div>
        ) : null}
      </Card>

      {grouped.map(([pill, items]) => (
        <div key={pill} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">{pill}</h2>
            <span className="h-px flex-1 bg-fh-border" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {items.map((m) => (
              <Card key={m.type} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{m.title}</div>
                    <div className="text-sm text-fh-muted">{m.subtitle}</div>
                  </div>
                  <Badge>{m.pill}</Badge>
                </div>

                <button
                  onClick={() => void launch(m.type)}
                  disabled={busyType !== null}
                  className="w-full rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
                >
                  {busyType === m.type ? "Creando..." : "Iniciar"}
                </button>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </Screen>
  );
}
