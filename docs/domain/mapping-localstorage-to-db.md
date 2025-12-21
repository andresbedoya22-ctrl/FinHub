# Mapping localStorage → DB (v1)

## Keys de localStorage (exactas)
- Cases: `fh_cases_state_v1`
- Documents: `fh_documents_state_v1`

---

## 1) Cases (fh_cases_state_v1)

### Estructura (frontend)
CasesState:
- cases: CaseEntity[]
- draftsByCaseId: Record<string, CaseDraft>

CaseEntity:
- id, type, title, status, stepKey, steps[], createdAt, updatedAt

CaseDraft:
- objeto libre: `{ [stepKey: string]: unknown }`

### Canonical DB recomendado
Tabla `cases`:
- id (uuid)
- user_id (uuid)
- type (CaseType)
- title
- status (CaseStatus)
- step_key (StepKey)
- steps_json (jsonb)  // opcional; se puede derivar por type
- created_at, updated_at

Tabla `case_step_data` (normalización de drafts):
- id (uuid)
- case_id (uuid)
- step_key (StepKey)
- data (jsonb)
- completed_at null
- created_at, updated_at
- constraint unique (case_id, step_key)

### Transformación (migración futura)
Para cada `CaseEntity`:
- insertar/actualizar fila en `cases`.

Para cada `draftsByCaseId[caseId]`:
- por cada key del objeto (cada `stepKey`), upsert en `case_step_data`:
  - (case_id, step_key) único
  - data = payload del draft para ese step

---

## 2) Documents (fh_documents_state_v1)

### Estructura (frontend)
DocumentsState:
- documents: DocumentEntity[]

DocumentEntity:
- id, fileName, type, status, caseId?, notes?, createdAt, updatedAt

### Canonical DB recomendado
Tabla `documents`:
- id (uuid)
- user_id (uuid)
- case_id nullable
- file_name
- type (DocumentType)
- status (DocumentStatus)
- notes nullable
- storage_path nullable (hasta Fase 6)
- mime_type nullable
- created_at, updated_at

### Transformación (migración futura)
- por cada `DocumentEntity`, insertar/actualizar en `documents`.
- si `caseId` existe, setear `case_id`.
