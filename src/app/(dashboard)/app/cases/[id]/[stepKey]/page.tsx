import Link from "next/link";

import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";

import { StepClient } from "./ui/StepClient";

export default function CaseStepPage({
  params,
}: {
  params: { id: string; stepKey: string };
}) {
  return (
    <Screen className="space-y-6">
      <Header
        title="Wizard"
        subtitle={`Case: ${params.id} · Step: ${params.stepKey}`}
        right={
          <Link
            href={`/app/cases/${params.id}`}
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            Detalle
          </Link>
        }
      />

      <Card className="space-y-4">
        <StepClient caseId={params.id} stepKey={params.stepKey} />
      </Card>
    </Screen>
  );
}
