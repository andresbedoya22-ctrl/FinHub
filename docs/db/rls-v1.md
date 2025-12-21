# RLS v1 (estrategia)

Objetivo: cada usuario solo accede a sus recursos.

## Tablas y regla base
- profiles: solo (id = auth.uid()).
- cases: solo filas con (user_id = auth.uid()).
- case_step_data: acceso solo si el case asociado pertenece al usuario.
- documents: solo filas con (user_id = auth.uid()).
- payments: solo filas con (user_id = auth.uid()).
- consents: solo filas con (user_id = auth.uid()).

## Admin queue
- /admin/cases requiere rol admin/operator (claim en JWT o tabla roles).
- Admin puede leer cases (y opcionalmente documents) para revisión humana.

## Notas
- Consent debe auditarse siempre (createdAt + source).
- Separa comunicaciones transaccionales de marketing: marketing debe ser opt-in.
