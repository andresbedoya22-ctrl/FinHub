import { Screen } from "@/ui/components/Screen";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";

export default function PrivacyPage() {
  return (
    <Screen>
      <Header title="Política de Privacidad" subtitle="Beta – borrador informativo" />
      <div className="space-y-4">
        <Card>
          <div className="space-y-3">
            <p className="text-sm opacity-80">
              Esta Política de Privacidad explica cómo FinHub (beta) trata datos personales cuando usas la web.
              Este documento se ajustará antes del lanzamiento a producción.
            </p>

            <h2 className="text-base font-semibold">1. Datos que tratamos</h2>
            <ul className="list-disc pl-5 text-sm space-y-1 opacity-90">
              <li>Cuenta: email, id de usuario, roles.</li>
              <li>Uso y seguridad: logs mínimos de auditoría para seguridad y troubleshooting.</li>
              <li>Casos: metadatos del caso y pasos realizados.</li>
              <li>Documentos: metadatos, OCR y resultados de extracción/validación.</li>
            </ul>

            <h2 className="text-base font-semibold">2. Finalidad y base legal</h2>
            <ul className="list-disc pl-5 text-sm space-y-1 opacity-90">
              <li>Prestar el servicio (ejecución de contrato / medidas precontractuales).</li>
              <li>Seguridad y prevención de abuso (interés legítimo).</li>
              <li>Cumplimiento de obligaciones legales cuando aplique.</li>
            </ul>

            <h2 className="text-base font-semibold">3. Retención</h2>
            <p className="text-sm opacity-90">
              Retenemos datos solo el tiempo necesario para el servicio y seguridad. Las reglas de retención
              para beta se documentan y se publicarán antes del lanzamiento a producción.
            </p>

            <h2 className="text-base font-semibold">4. Encargados/Subprocesadores</h2>
            <p className="text-sm opacity-90">
              FinHub puede usar terceros para hosting, base de datos, pagos y procesamiento OCR/IA. El detalle
              se documenta y se publicará antes de producción.
            </p>

            <h2 className="text-base font-semibold">5. Tus derechos</h2>
            <p className="text-sm opacity-90">
              Puedes solicitar acceso/exportación o borrado de tus datos. En beta puedes usar las herramientas
              del perfil (cuando estén disponibles) o contactarnos.
            </p>

            <h2 className="text-base font-semibold">Contacto</h2>
            <p className="text-sm opacity-90">
              Solicitudes de privacidad: <span className="font-medium">privacy@finhub.local</span>
            </p>
          </div>
        </Card>
      </div>
    </Screen>
  );
}
