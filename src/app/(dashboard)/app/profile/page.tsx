import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { ProfileClient } from "./ui/ProfileClient";

export default function Profile() {
  return (
    <Screen className="space-y-6">
      <Header title="Perfil" subtitle="Beta. Perfil + ajustes básicos y herramientas de privacidad." />

      <Card className="space-y-3">
        <InfoBox title="Pendiente (Sprint 1)" variant="info">
          Preferencia de idioma, datos personales mínimos, y estado de cuenta (suscripción / pay-per-case).
        </InfoBox>
      </Card>

      <ProfileClient />
    </Screen>
  );
}
