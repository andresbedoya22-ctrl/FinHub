import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { Badge } from "@/ui/components/Badge";
import { InfoBox } from "@/ui/components/InfoBox";

export default function DashboardHome() {
  return (
    <Screen className="space-y-6">
      <Header
        title="Inicio"
        subtitle="Home privado (placeholder). En Fase 2 estandarizamos UI; en Fase 5+ se conecta Case Engine, documentos y pagos."
        right={<Badge>Fase 2</Badge>}
      />

      <Card className="space-y-3">
        <p className="text-sm text-fh-muted">
          Objetivo: una base visual consistente (tokens + componentes) para
          escalar mÃƒÂ³dulos sin deuda de UI.
        </p>

        <InfoBox title="Siguiente" variant="info">
          CrearÃƒÂ¡s flujo real de Ã¢â‚¬Å“casosÃ¢â‚¬Â y Document Vault en fases posteriores.
          AquÃƒÂ­ solo hay navegaciÃƒÂ³n y componentes base.
        </InfoBox>
      </Card>
    </Screen>
  );
}
