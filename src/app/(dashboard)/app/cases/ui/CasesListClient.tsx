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
  const { state, deleteCase } = useCases();

  if (state.cases.length === 0) {
    return (
      <Card>
        <InfoBox title="Sin casos" variant="warning">
          Crea tu primer caso para empezar el flujo.
        </InfoBox>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {state.cases.map((c) => (
        <Card key={c.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold">{c.title}</div>
              {pill(c.type)}
              {pill(c.status)}
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
              onClick={() => deleteCase(c.id)}
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
