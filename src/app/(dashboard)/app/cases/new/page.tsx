import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";

import { NewCaseClient } from "./ui/NewCaseClient";

export default function NewCasePage() {
  return (
    <Screen className="space-y-6">
      <Header
        title="Crear caso"
        subtitle="Crea un caso y comienza el wizard por pasos (persistencia local)."
      />

      <Card className="space-y-4">
        <NewCaseClient />
      </Card>
    </Screen>
  );
}
