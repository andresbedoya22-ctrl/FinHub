# OCR Map (v2.2)

## Endpoints observados
- POST /api/documents/[id]/ocr
- POST /api/documents/[id]/verify
- GET  /api/documents/[id]/extraction
- UI: /app/documents/ocr-review (+ detalle)

## Pipeline (alto nivel, por confirmar)
- upload → storage → OCR text provider → parser/schema → extraction → verify → human review

## Storage / auditoría (TBD)
- Confirmar buckets, paths y trazabilidad (requestId/caseId/documentId)
