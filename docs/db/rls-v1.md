# RLS v1 (estrategia)

Objetivo: cada usuario solo accede a sus recursos.

## Tablas y regla base
- profiles: solo (id = auth.uid()).
- cases: solo filas con (user_id = auth.uid()).
- case_step_data: acceso solo si el case asociado pertenece al usuario.
- documents: solo filas con (user_id = auth.uid()).
- payments: solo filas con (user_id = auth.uid()).
- consents: solo filas con (user_id = auth.uid()).

## Storage (bucket "vault")
Regla: los objetos deben guardarse con path `{auth.uid()}/...`.

Policies (storage.objects, bucket_id='vault'):
- SELECT: owner (primer segmento del path = auth.uid()) o admin (public.is_admin()).
- INSERT/UPDATE/DELETE: solo owner (path debe iniciar con auth.uid()).

## Admin queue
- /admin/cases requiere rol admin/operator (claim en JWT o tabla roles).
- Admin puede leer cases (y opcionalmente documents) para revisiÃ³n humana.

## Notas
- Consent debe auditarse siempre (createdAt + source).
- Separa comunicaciones transaccionales de marketing: marketing debe ser opt-in.

