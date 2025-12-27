# OCR (v1)

## Objetivo
Extraer texto desde el archivo almacenado en Supabase Storage y generar una `document_extractions` con:
- `extraction_type = "machtigingsregistratie"`
- `schema_version = MACHTIGINGSREGISTRATIE_SCHEMA_VERSION`
- `fields` validados por `validateForSaveMachtigingsregistratieFieldsV1`

## Providers
Se selecciona vía `FINHUB_OCR_PROVIDER`:
- `mock` (default): texto determinista basado en filename.
- `azure`: Azure AI Document Intelligence (prebuilt-read por defecto).

## Variables de entorno
- `FINHUB_OCR_PROVIDER=mock|azure`

### Azure (si FINHUB_OCR_PROVIDER=azure)
Requeridas:
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
- `AZURE_DOCUMENT_INTELLIGENCE_KEY`

Opcionales:
- `AZURE_DOCUMENT_INTELLIGENCE_API_VERSION` (default `2024-11-30`)
- `AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID` (default `prebuilt-read`)

## Flujo API
`POST /api/documents/[id]/ocr`:
1. Verifica autenticación y ownership del documento
2. Lee `documents.storage_path`
3. Crea signed URL (120s) y descarga bytes
4. Provider -> `rawText`
5. Parser -> `fields` validados
6. Persiste `document_ocr_runs` + `document_extractions` + `document_reviews`
