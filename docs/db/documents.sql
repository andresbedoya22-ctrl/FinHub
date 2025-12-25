-- FinHub — Documents Vault v1
-- Snapshot REAL del estado en Supabase (DDL/constraints/policies/bucket)
-- Generado a partir de queries contra: information_schema / pg_constraint / pg_policies / storage.buckets

-- =========================================================
-- 1) Tabla documents — columnas (snapshot)
-- =========================================================
-- Fuente: information_schema.columns (public.documents)

-- id uuid NOT NULL DEFAULT gen_random_uuid()
-- case_id uuid NULL
-- user_id uuid NOT NULL
-- file_name text NOT NULL
-- storage_path text NULL
-- mime_type text NULL
-- size_bytes bigint NULL
-- created_at timestamptz NOT NULL DEFAULT now()
-- notes text NULL
-- status text NOT NULL DEFAULT 'uploaded'::text
-- type text NOT NULL DEFAULT 'unknown'::text
-- filename text NULL
-- updated_at timestamptz NOT NULL DEFAULT now()

-- Nota:
-- - Existen AMBAS columnas: file_name (usada por la app) y filename (legacy/extra).
-- - storage_path es NULLable según el snapshot; en la app se llena siempre para coherencia.
-- - type por defecto 'unknown', pero en la app se usa union DocumentType (id/income/bank/rental/tax/other).

-- =========================================================
-- 2) Constraints (snapshot)
-- =========================================================
-- Fuente: pg_constraint

-- PRIMARY KEY
-- documents_pkey: PRIMARY KEY (id)

-- FOREIGN KEYS
-- documents_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- documents_case_id_fkey: FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE

-- CHECKS
-- documents_status_check:
--   CHECK (
--     status = ANY (ARRAY[
--       'uploaded'::text,
--       'under_review'::text,
--       'approved'::text,
--       'rejected'::text
--     ])
--   )

-- =========================================================
-- 3) RLS + Policies (public.documents) — snapshot
-- =========================================================
-- Fuente: pg_policies
-- Asegúrate de que RLS esté ENABLED en la tabla documents.

-- Policy: documents_select_own
-- cmd: SELECT
-- roles: {public}
-- USING: (user_id = auth.uid())

-- Policy: documents_insert_own
-- cmd: INSERT
-- roles: {public}
-- WITH CHECK: (user_id = auth.uid())

-- Policy: documents_update_own
-- cmd: UPDATE
-- roles: {public}
-- USING: (user_id = auth.uid())

-- Policy: documents_delete_own
-- cmd: DELETE
-- roles: {public}
-- USING: (user_id = auth.uid())

-- Policy: documents_admin_select_all
-- cmd: SELECT
-- roles: {authenticated}
-- USING: is_admin()

-- Nota:
-- - La policy admin permite leer todos los documentos si is_admin() = true.
-- - Usuarios normales solo operan sobre sus propios documentos.

-- =========================================================
-- 4) Storage bucket vault + policies storage.objects — snapshot
-- =========================================================
-- Fuente: storage.buckets + pg_policies (storage.objects)

-- Bucket:
-- id: vault
-- name: vault
-- public: false
-- created_at: 2025-12-25 13:57:12.307261+00

-- Policies en storage.objects (bucket vault):
-- Importante: estas políticas asumen que los objetos se suben con path:
--   "<auth.uid()>/<archivo>"
-- (i.e., primer folder del "name" es el user id)

-- Policy: vault_read_own
-- cmd: SELECT
-- roles: {authenticated}
-- USING:
--   (bucket_id = 'vault'::text)
--   AND ((storage.foldername(name))[1] = (auth.uid())::text)

-- Policy: vault_insert_own
-- cmd: INSERT
-- roles: {authenticated}
-- WITH CHECK:
--   (bucket_id = 'vault'::text)
--   AND ((storage.foldername(name))[1] = (auth.uid())::text)

-- Policy: vault_update_own
-- cmd: UPDATE
-- roles: {authenticated}
-- USING:
--   (bucket_id = 'vault'::text)
--   AND ((storage.foldername(name))[1] = (auth.uid())::text)
-- WITH CHECK:
--   (bucket_id = 'vault'::text)
--   AND ((storage.foldername(name))[1] = (auth.uid())::text)

-- Policy: vault_delete_own
-- cmd: DELETE
-- roles: {authenticated}
-- USING:
--   (bucket_id = 'vault'::text)
--   AND ((storage.foldername(name))[1] = (auth.uid())::text)

-- =========================================================
-- 5) Observaciones operativas (muy importante)
-- =========================================================
-- 1) En la UI/cliente, el upload debe usar:
--      supabase.storage.from("vault").upload(`${userId}/${...}`, file)
--    para que las policies de storage funcionen (foldername(name)[1] == auth.uid()).
--
-- 2) En la tabla documents, storage_path puede almacenar:
--      `${userId}/${...}`  (recomendado)
--    o
--      `vault/${userId}/${...}` (si lo prefieres)
--    pero sé consistente con lo que usa el backend/cliente para generar signed URLs.
--
-- 3) Status permitidos por constraint:
--      uploaded | under_review | approved | rejected
--    El frontend debe reflejar exactamente estos valores.
--
-- 4) Existe columna "filename" además de "file_name".
--    Si no se usa, se puede limpiar en una fase posterior (migración controlada).
