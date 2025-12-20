import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

export default function Documents() {
  return (
    <Screen className="space-y-6">
      <Header
        title="Documentos"
        subtitle="Placeholder. En Sprint 1: Document Vault básico (upload + lista + estado)."
      />

      <Card className="space-y-3">
        <InfoBox title="Objetivo" variant="info">
          Centralizar documentos por caso: checklist, subida, validación y luego
          OCR/editor en fases posteriores.
        </InfoBox>
      </Card>
    </Screen>
  );
}
