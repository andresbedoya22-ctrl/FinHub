import Link from "next/link";

import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";

import { CaseOverviewClient } from "./ui/CaseOverviewClient";

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  return (
    <Screen className="space-y-6">
      <Header
        title="Detalle del caso"
        subtitle={`ID: ${params.id}`}
        right={
          <Link
            href="/app/cases"
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            Volver
          </Link>
        }
      />

      <Card className="space-y-4">
        <CaseOverviewClient caseId={params.id} />
      </Card>
    </Screen>
  );
}
