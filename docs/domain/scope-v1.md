# Scope v1 — Fuente de verdad

## Incluye (In)
- Web responsive.
- Flujos tipo Case con wizard por `stepKey`.
- Toeslagen:
  - Tipos: `toeslag_huur`, `toeslag_zorg`, `toeslag_kinderopvang`
  - Steps: `eligibility → result → checkout → authorization → documents → review`
- Impuestos particulares:
  - Tipos: `tax_ib`, `tax_voorlopige_aanslag`
  - Steps: `intake → documents → review → submission → done`
- Finanzas personales / intake:
  - Tipos: `finances_intake`, `document_review`
  - Steps: `intake → documents → review → done`
- Document Vault v1: gestión de documentos (tipo/estado/notas) y asociación opcional a Case.
- Contratos API (OpenAPI v1) y esquema SQL v1 para backend (Fase 6).

## No incluye (Out)
- ZZP/BTW (empresa) y contabilidad empresarial.
- PSD2/bank connections (puede ir en fases posteriores).
- Automatización completa de envíos sin revisión humana.
- OCR real con proveedor externo (solo modelo y endpoint; implementación en Fase 7).

## Principios
- Persistencia actual en frontend: `localStorage` (estado v1 de cases y documents).
- Backend v1 (futuro) debe ser coherente con:
  - enums actuales de frontend (`CaseType`, `CaseStatus`, `StepKey`, `DocumentType`, `DocumentStatus`)
  - y la estructura de drafts por `stepKey`.
