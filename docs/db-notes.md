# DB Notes

## profiles.preferred_language_check
- El CHECK constraint de profiles.preferred_language es case-sensitive.
- En local, el valor permitido observado fue ES (no es).
- Los tests deben usar un valor permitido por el constraint.

## Paid gate (post-checkout)
- Test reproducible: scripts/db/test-paid-gate.ps1
- Valida que cases.step_key y case_step_data.step_key bloqueen steps uthorization/documents/review/intake/submission/done si no existe un payment con status='paid'.