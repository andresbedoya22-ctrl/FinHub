"use client";

import Link from "next/link";
import { useCases } from "@/features/cases/casesStore";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

type StepDef = { key: string; label: string };

function stepsFor(type: string): StepDef[] {
  if (type.indexOf("toeslag_") === 0) {
    return [
      { key: "eligibility", label: "Eligibility" },
      { key: "result", label: "Result" },
      { key: "checkout", label: "Checkout" },
      { key: "authorization", label: "Authorization" },
      { key: "documents", label: "Documents" },
      { key: "review", label: "Review" },
    ];
  }
  if (type.indexOf("tax_") === 0 || type.indexOf("finances_") === 0) {
    return [
      { key: "intake", label: "Intake" },
      { key: "documents", label: "Documents" },
      { key: "review", label: "Review" },
    ];
  }
  return [{ key: "start", label: "Start" }];
}

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

  const steps = stepsFor(String(c.type));
  const fallback: StepDef = steps[0] || { key: "start", label: "Start" };

  const idxRaw = steps.findIndex((x) => x.key === c.stepKey);
  const idx = idxRaw >= 0 ? idxRaw : 0;

  const current: StepDef = steps[idx] || fallback;
  const next: StepDef = steps[Math.min(idx + 1, steps.length - 1)] || current;

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <div className="font-semibold">{c.title}</div>
        <div className="opacity-80">
          type: {String(c.type)} · status: {c.status} · step: {c.stepKey}
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
          Marcar “under_review”
        </button>

        <button
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          onClick={() => void setStatus(c.id, "completed")}
        >
          Marcar “completed”
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