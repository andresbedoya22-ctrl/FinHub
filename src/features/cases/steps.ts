export type CaseType =
  | `toeslag_${string}`
  | `tax_${string}`
  | `finances_${string}`
  | string;

export type StepDef = { key: string; label: string };

// Source of truth: keys usados en routing + DB constraint.
// Nota: "submission" existe en DB pero aún no está en UI; lo mantenemos permitido.
export const ALL_STEP_KEYS = [
  "start",
  "eligibility",
  "result",
  "checkout",
  "authorization",
  "documents",
  "review",
  "intake",
  "submission",
  "done",
] as const;

export type StepKey = (typeof ALL_STEP_KEYS)[number];

export function isValidStepKey(stepKey: string): stepKey is StepKey {
  return (ALL_STEP_KEYS as readonly string[]).includes(stepKey);
}

export function normalizeStepKey(raw: string): StepKey {
  const s = String(raw || "").trim().toLowerCase();
  return isValidStepKey(s) ? s : "start";
}

export function stepsForCaseType(type: CaseType): StepDef[] {
  const t = String(type || "");

  if (t.startsWith("toeslag_")) {
    return [
      { key: "eligibility", label: "Eligibility" },
      { key: "result", label: "Result" },
      { key: "checkout", label: "Checkout" },
      { key: "authorization", label: "Authorization" },
      { key: "documents", label: "Documents" },
      { key: "review", label: "Review" },
    ];
  }

  if (t.startsWith("tax_") || t.startsWith("finances_")) {
    return [
      { key: "intake", label: "Intake" },
      { key: "documents", label: "Documents" },
      { key: "review", label: "Review" },
    ];
  }

  return [{ key: "start", label: "Start" }];
}

export function getCurrentAndNextStep(
  steps: StepDef[],
  currentKey: string
): { current: StepDef; next: StepDef } {
  const fallback: StepDef = steps[0] ?? { key: "start", label: "Start" };

  const idxRaw = steps.findIndex((x) => x.key === currentKey);
  const idx = idxRaw >= 0 ? idxRaw : 0;

  const current: StepDef = steps[idx] ?? fallback;
  const next: StepDef = steps[Math.min(idx + 1, steps.length - 1)] ?? current;

  return { current, next };
}