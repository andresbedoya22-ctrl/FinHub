import Link from "next/link";
import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

export default function LoginPage() {
  return (
    <Screen className="space-y-6">
      <Header
        title="Login"
        subtitle="Placeholder. La autenticación real se implementa en la siguiente fase."
        right={
          <Link
            href="/app"
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            Ir al Dashboard
          </Link>
        }
      />

      <Card className="space-y-3">
        <InfoBox title="Pendiente" variant="warning">
          Auth real + roles + protección de rutas.
        </InfoBox>
      </Card>
    </Screen>
  );
}
