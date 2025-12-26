import Link from "next/link";

import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

import { CasesListClient } from "./ui/CasesListClient";

export default function CasesPage() {
  return (
    <Screen className="space-y-6">
      <Header
        title="Casos"
        subtitle="Case Engine v1: lista, creación y navegación por pasos (persistencia local)."
        right={
          <Link
            href="/app/cases/new"
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            Crear caso
          </Link>
        }
      />

      <Card className="space-y-3">
        <InfoBox title="Objetivo" variant="info">
          Esta capa es la base para asociar documentos y flujos (toeslagen, impuestos, finanzas).
        </InfoBox>
      </Card>

      <CasesListClient />
    </Screen>
  );
}
