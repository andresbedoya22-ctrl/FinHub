import Link from "next/link";

import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

import { CaseOverviewClient } from "./ui/CaseOverviewClient";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Screen className="space-y-6">
      <Header
        title="Detalle del caso"
        subtitle={`ID: ${id}`}
        right={
          <Link
            href="/app/cases"
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            Volver
          </Link>
        }
      />

      <Card className="space-y-3">
        <InfoBox title="Objetivo" variant="info">
          Resumen y navegación del caso.
        </InfoBox>
      </Card>

      <CaseOverviewClient caseId={id} />
    </Screen>
  );
}