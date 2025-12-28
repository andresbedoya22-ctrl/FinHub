import { Screen } from "@/ui/components/Screen";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";

export default function TermsPage() {
  return (
    <Screen>
      <Header title="Términos del Servicio" subtitle="Beta – borrador informativo" />
      <div className="space-y-4">
        <Card>
          <div className="space-y-3">
            <p className="text-sm opacity-80">
              Estos términos regulan el uso de FinHub (beta). Este documento se ajustará antes del lanzamiento a producción.
            </p>

            <h2 className="text-base font-semibold">1. Servicio en beta</h2>
            <p className="text-sm opacity-90">
              FinHub se ofrece en modo beta “best-effort”. Las funcionalidades pueden cambiar, estar incompletas
              o no estar disponibles temporalmente.
            </p>

            <h2 className="text-base font-semibold">2. Uso aceptable</h2>
            <ul className="list-disc pl-5 text-sm space-y-1 opacity-90">
              <li>No abuso, scraping o ataques automatizados.</li>
              <li>No uso ilegal ni tratamiento indebido de datos personales.</li>
              <li>No intentar evadir controles de seguridad.</li>
            </ul>

            <h2 className="text-base font-semibold">3. No es asesoría profesional</h2>
            <p className="text-sm opacity-90">
              La información del sistema o del asistente es informativa y no constituye asesoría legal/fiscal/financiera.
              Tú sigues siendo responsable de tus decisiones y envíos.
            </p>

            <h2 className="text-base font-semibold">4. Limitación de responsabilidad</h2>
            <p className="text-sm opacity-90">
              En la medida permitida por ley, el servicio se ofrece “tal cual” y no respondemos por daños indirectos o consecuenciales.
            </p>

            <h2 className="text-base font-semibold">Contacto</h2>
            <p className="text-sm opacity-90">
              Soporte: <span className="font-medium">support@finhub.local</span>
            </p>
          </div>
        </Card>
      </div>
    </Screen>
  );
}
