"use client";

import Link from "next/link";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { useCases } from "@/features/cases/casesStore";

function pill(text: string) {
  return (
    <span className="rounded-xl border border-fh-border bg-fh-surface px-2 py-1 text-xs">
      {text}
    </span>
  );
}

export function CasesListClient() {
  const cases = useCases((s) => s.state.cases);
  const isLoading = useCases((s) => s.state.isLoading);
  const error = useCases((s) => s.state.error);
  const loadCases = useCases((s) => s.loadCases);
  const deleteCase = useCases((s) => s.deleteCase);

  if (isLoading) {
    return (
      <Card className="space-y-2">
        <InfoBox title="Cargando" variant="info">
          Cargando tus casos...
        </InfoBox>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="space-y-3">
        <InfoBox title="Error cargando casos" variant="danger">
          {error}
        </InfoBox>

        <button
          onClick={() => void loadCases()}
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
        >
          Reintentar
        </button>
      </Card>
    );
  }

  if (!cases || cases.length === 0) {
    return (
      <Card className="space-y-3">
        <InfoBox title="Sin casos" variant="warning">
          Crea tu primer caso para empezar el flujo.
        </InfoBox>
        <button
          onClick={() => void loadCases()}
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
        >
          Refrescar
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => void loadCases()}
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
        >
          Refrescar
        </button>
      </div>

      {cases.map((c) => (
        <Card key={c.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold">{c.title}</div>
              {pill(String(c.type))}
              {pill(String(c.status))}
              {pill(`step: ${c.stepKey}`)}
            </div>
            <div className="text-xs text-fh-muted">
              Actualizado: {new Date(c.updatedAt).toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/app/cases/${c.id}/${c.stepKey}`}
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              Continuar
            </Link>

            <Link
              href={`/app/cases/${c.id}`}
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              Ver
            </Link>

            <button
              onClick={() => void deleteCase(c.id)}
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              Eliminar
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
