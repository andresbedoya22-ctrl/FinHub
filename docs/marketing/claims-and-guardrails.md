# FinHub — Claims & Guardrails (F02.2.1 P0)

Objetivo: evitar promesas falsas y mantener consistencia legal/UX.

## Claims permitidos (P0)
- No pedimos tu contraseña DigiD.
- OCR con revisión humana cuando aplica.
- Privacidad por diseño: telemetría non-PII.
- Flujos guiados y checklist de documentos.

## Claims prohibidos (hasta implementar y auditar)
- "Enviamos tu declaración automáticamente" (si no está integrado/validado).
- "Aprobación garantizada" / "Resultados garantizados".
- "Cumplimiento legal garantizado" (solo “ayuda a reducir errores”).

## Guardrails de contenido
- Evitar lenguaje médico/asegurador con promesas.
- Evitar consejos fiscales como “definitivos”; usar “orientativo”.
- Si hay soporte humano: decir “revisión humana cuando aplica”.

## Guardrails Finny Lite
- No pedir datos personales.
- No instrucciones operativas de acceso a portales (DigiD).
- Respuestas cortas + CTA a crear cuenta / iniciar flujo.

## QA antes de publicar
- Revisar que landing.* no contenga claims prohibidos.
- Revisar que pricing no implique features inexistentes.
