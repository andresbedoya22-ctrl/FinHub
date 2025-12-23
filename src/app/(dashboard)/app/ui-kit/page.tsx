import Link from "next/link";
import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { Badge } from "@/ui/components/Badge";
import { InfoBox } from "@/ui/components/InfoBox";

export default function UiKitPage() {
  return (
    <Screen className="space-y-6">
      <Header
        title="UI Kit"
        subtitle="Referencia visual y de tokens. Todo componente nuevo debe verse aquÃƒÂ­ con estados."
        right={
          <Link
            href="/app"
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            Volver
          </Link>
        }
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
        </div>

        <InfoBox title="Regla" variant="warning">
          No usar colores hardcodeados en pantallas. Todo debe referenciar tokens
          (`fh.*`) o utilidades del kit.
        </InfoBox>

        <InfoBox title="Control" variant="info">
          Si esta pantalla se ve bien en mÃƒÂ³vil y desktop, la base visual estÃƒÂ¡
          estable.
        </InfoBox>
      </Card>
    </Screen>
  );
}
