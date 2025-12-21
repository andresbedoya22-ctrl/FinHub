"use client";

import Link from "next/link";
import { InfoBox } from "@/ui/components/InfoBox";
import { useCases } from "@/features/cases/casesStore";

export function CaseOverviewClient({ caseId }: { caseId: string }) {
  const { getCase, setStatus } = useCases();
  const c = getCase(caseId);

  if (!c) {
    return (
      <InfoBox title="No encontrado" variant="warning">
        Este case no existe (o fue eliminado).
      </InfoBox>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-sm font-semibold">{c.title}</div>
        <div className="text-xs text-fh-muted">
          type: {c.type} · status: {c.status} · step: {c.stepKey}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/app/cases/${c.id}/${c.stepKey}`}
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
        >
          Continuar
        </Link>

        <Link
          href={`/app/cases/${c.id}/${c.steps[0]?.key ?? "intake"}`}
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
        >
          Ir al primer paso
        </Link>

        <button
          onClick={() => setStatus(c.id, "under_review")}
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
        >
          Marcar “under_review”
        </button>

        <button
          onClick={() => setStatus(c.id, "completed")}
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
        >
          Marcar “completed”
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Pasos</div>
        <div className="flex flex-wrap gap-2">
          {c.steps.map((s) => (
            <Link
              key={s.key}
              href={`/app/cases/${c.id}/${s.key}`}
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
