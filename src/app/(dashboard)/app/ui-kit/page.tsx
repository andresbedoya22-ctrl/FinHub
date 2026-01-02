"use client";

import * as React from "react";
import Link from "next/link";
import { Screen } from "@/ui/components/Screen";
import { Card } from "@/ui/components/Card";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";
import { LanguageSwitcher } from "@/ui/components/LanguageSwitcher";
import { ToggleGroup } from "@/ui/components/ToggleGroup";
import { Stepper } from "@/ui/components/Stepper";

export default function UiKitPage() {
  const [name, setName] = React.useState("Andres");
  const [email, setEmail] = React.useState("andres@example.com");

  const [seg, setSeg] = React.useState<"personal" | "business">("personal");
  const [step, setStep] = React.useState("eligibility");

  return (
    <Screen className="space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-fh-text">UI Kit</div>
          <div className="text-sm text-fh-muted">Componentes base + tokens (Fase 2.2)</div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/landing" className="text-sm underline text-fh-muted hover:text-fh-text">
            Ir a Landing
          </Link>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="text-lg font-semibold text-fh-text">Buttons</div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="text-lg font-semibold text-fh-text">Inputs</div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
          <Input label="Con error" value="x" error="Ejemplo de error" onChange={() => {}} />
          <Input label="Con hint" value="" hint="Ejemplo de ayuda" onChange={() => {}} />
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="text-lg font-semibold text-fh-text">ToggleGroup</div>
        <ToggleGroup
          label="Tipo de perfil"
          value={seg}
          onValueChange={(v) => setSeg(v)}
          options={[
            { value: "personal", label: "Personal", description: "Gastos, presupuestos, metas." },
            { value: "business", label: "Negocio (ZZP)", description: "Ingresos, gastos, BTW, reportes." },
          ]}
        />
      </Card>

      <Card className="space-y-4">
        <div className="text-lg font-semibold text-fh-text">Stepper</div>
        <Stepper
          activeKey={step}
          onStepChange={setStep}
          steps={[
            { key: "eligibility", title: "Eligibility", description: "Comprobación inicial." },
            { key: "result", title: "Resultado", description: "Resumen y siguientes pasos." },
            { key: "checkout", title: "Checkout", description: "Pago / activación." },
            { key: "docs", title: "Documentos", description: "Checklist + upload." },
            { key: "review", title: "Revisión", description: "Validación humana si aplica." },
          ]}
        />
      </Card>

      <div className="text-xs text-fh-muted">
        Nota: este UI Kit es la referencia única para estilos. Evitar hardcodes fuera de tokens.
      </div>
    </Screen>
  );
}
