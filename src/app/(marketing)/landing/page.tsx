import Link from "next/link";
import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

export default function LandingPage() {
  return (
    <Screen className="space-y-6">
      <Header
        title="FinHub"
        subtitle="Plataforma financiera para migrantes en NL. (Landing placeholder)"
        right={
          <Link
            href="/login"
            className="rounded-xl border border-fh-border bg-fh-primary px-3 py-2 text-sm text-fh-primaryFg hover:opacity-90"
          >
            Ir a Login
          </Link>
        }
      />

      <Card className="space-y-3">
        <InfoBox title="Fase actual" variant="info">
          UI System listo. En la siguiente fase se construye Case Engine, Document Vault y flujo de casos.
        </InfoBox>
      </Card>
    </Screen>
  );
}
