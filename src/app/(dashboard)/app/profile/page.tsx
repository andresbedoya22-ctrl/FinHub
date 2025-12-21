import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

export default function Profile() {
  return (
    <Screen className="space-y-6">
      <Header
        title="Perfil"
        subtitle="Placeholder. En Sprint 1: perfil + idioma preferido + ajustes bÃ¡sicos."
      />

      <Card className="space-y-3">
        <InfoBox title="Pendiente (Sprint 1)" variant="info">
          Preferencia de idioma, datos personales mÃ­nimos, y estado de cuenta
          (suscripciÃ³n / pay-per-case).
        </InfoBox>
      </Card>
    </Screen>
  );
}
