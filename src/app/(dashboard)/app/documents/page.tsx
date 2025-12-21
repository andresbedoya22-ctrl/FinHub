import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

import { DocumentsClient } from "./ui/DocumentsClient";

export default function Documents() {
  return (
    <Screen className="space-y-6">
      <Header
        title="Documentos"
        subtitle="Document Vault v1: mock upload + lista + estado + asignación a caso (persistencia local)."
      />

      <Card className="space-y-3">
        <InfoBox title="Objetivo" variant="info">
          Centralizar documentos por caso: checklist, subida, validación y luego OCR/editor en fases posteriores.
        </InfoBox>
      </Card>

      <DocumentsClient />
    </Screen>
  );
}
