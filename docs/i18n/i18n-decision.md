# i18n Decision (v2.2)

## Scope
Foundation (P0) para evitar refactors antes de Landing/Auth/Finny.

## Default locale
- Default: en (toda la app inicia en inglés; el usuario puede cambiarlo)

## URL strategy
- Sin prefijo de locale en la URL (no `/en/*`, `/es/*`).

## Locale resolution (orden)
1) Cookie `fh_locale`
2) Profile `profile.locale` (pendiente; aún no implementado)
3) Header `Accept-Language`

## Persistencia
- Cookie `fh_locale` (lectura ya en foundation; escritura se añadirá cuando exista Settings/Profile UI).

## Supported locales (P0)
- en, es, pl, ro

## Nota sobre "nl"
Existe normalización `nl` en `src/features/i18n/lang.ts` por compatibilidad histórica.
Para P0, `nl` cae a `en` hasta que haya traducciones NL (no bloqueante).

## Open questions (para cerrar más adelante)
1) Tono por idioma: formal vs “tú” (recomendación: consistente).
2) Glosario fiscal: término NL fijo + traducción (p.ej. "toeslag (allowance/subsidio)").
3) Legal: traducción profesional obligatoria antes de producción.
