# Modelo de dominio v1 (alineado con frontend actual)

## Enums (exactos del frontend)

### CaseType
- toeslag_huur
- toeslag_zorg
- toeslag_kinderopvang
- tax_ib
- tax_voorlopige_aanslag
- finances_intake
- document_review

### CaseStatus
- created
- in_progress
- waiting_user
- submitted
- under_review
- completed
- cancelled

### StepKey
- eligibility
- result
- checkout
- authorization
- documents
- review
- intake
- submission
- done

### DocumentType
- id
- income
- bank
- rental
- tax
- other

### DocumentStatus
- pending
- ready
- reviewed

---

## Entidades

### Case
Representa un flujo guiado (wizard) por pasos (`stepKey`).

Campos:
- id: string (uuid recomendado)
- type: CaseType
- title: string
- status: CaseStatus
- stepKey: StepKey (paso actual)
- steps: Array<{ key: StepKey; label: string }>
  - Nota: actualmente se persiste en frontend; conceptualmente es derivable por `type`.
- createdAt: string ISO
- updatedAt: string ISO

### CaseDraft (drafts por step)
Persistencia libre por `stepKey`. Cada step guarda su payload sin backend.

Estructura:
- [stepKey: string]: unknown

En estado global:
- draftsByCaseId: Record<caseId, CaseDraft>

### CaseStepData (canonical en backend)
En backend conviene normalizar los drafts por fila:
- caseId
- stepKey
- data (json)
- completedAt? (timestamp)
- createdAt/updatedAt

### Document
Entidad de Document Vault v1.

Campos (frontend actual):
- id: string
- fileName: string
- type: DocumentType
- status: DocumentStatus
- caseId?: string (asociación opcional a Case)
- notes?: string
- createdAt: string ISO
- updatedAt: string ISO

Campos previstos backend (sin romper frontend):
- storagePath?: string (ruta en Storage)
- mimeType?: string

### Payment (v1 backend)
No existe aún en frontend, pero se define para contrato/DB:
- id, userId, caseId?
- provider ("stripe")
- status ("created"|"pending"|"paid"|"failed"|"refunded")
- amountCents, currency ("EUR")
- providerRefs (stripeSessionId/stripePaymentIntentId)
- createdAt/updatedAt

### Consent (v1 backend)
- id, userId
- type ("marketing_emails"|"in_app_offers")
- granted boolean
- source string
- createdAt/updatedAt

---

## State machine (recomendación v1)
Estos son estados de negocio compatibles con tus `CaseStatus` actuales:

- created → in_progress (cuando el usuario entra al flujo)
- in_progress → waiting_user (cuando falta acción del usuario: p.ej. authorization/documents)
- waiting_user → submitted (cuando el usuario envía/termina su parte)
- submitted → under_review (cuando entra a revisión humana)
- under_review → completed (cuando se cierra)
- cualquier estado → cancelled (cancelación)

Notas:
- `stepKey` es la fuente de verdad del punto del wizard.
- Los drafts (por stepKey) son la fuente de verdad del contenido del formulario hasta que haya backend.
