"use client";

import Link from "next/link";

import { useCases } from "@/features/cases/casesStore";
import { stepsForCaseType, getCurrentAndNextStep } from "@/features/cases/steps";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

export function CaseOverviewClient({ caseId }: { caseId: string }) {
  const c = useCases((s) => s.getCase(caseId));
  const setStatus = useCases((s) => s.setStatus);
  const setStepKey = useCases((s) => s.setStepKey);

  if (!c) {
    return (
      <Card>
        <InfoBox title="No encontrado" variant="warning">
          Este case no existe (o fue eliminado).
        </InfoBox>
      </Card>
    );
  }

  const steps = stepsForCaseType(String(c.type));
  const { current, next } = getCurrentAndNextStep(steps, String(c.stepKey));

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <div className="font-semibold">{c.title}</div>
        <div className="opacity-80">
          type: {String(c.type)} | status: {String(c.status)} | step: {String(c.stepKey)}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          onClick={() => void setStepKey(c.id, next.key)}
        >
          Continuar
        </button>

        <Link
          href={`/app/cases/${c.id}/${current.key}`}
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
        >
          Ir al step actual
        </Link>

        <button
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          onClick={() => void setStatus(c.id, "under_review")}
        >
          Marcar "under_review"
        </button>

        <button
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          onClick={() => void setStatus(c.id, "completed")}
        >
          Marcar "completed"
        </button>
      </div>

      <Card className="space-y-3">
        <div className="text-sm font-semibold">Pasos</div>
        <div className="flex flex-wrap gap-2">
          {steps.map((s) => (
            <Link
              key={s.key}
              href={`/app/cases/${c.id}/${s.key}`}
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}