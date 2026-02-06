import type { CaseStepKey } from "./casesTypes";

export type StepDef = { key: CaseStepKey; label: string };

export const ALL_STEP_KEYS: readonly CaseStepKey[] = [
  "intake",
  "eligibility",
  "result",
  "checkout",
  "authorization",
  "documents",
  "review",
  "submitted",
  "done",
];

export function isValidStepKey(stepKey: string): stepKey is CaseStepKey {
  return (ALL_STEP_KEYS as readonly string[]).includes(stepKey);
}

export function normalizeStepKey(raw: string): CaseStepKey {
  const s = String(raw || "").trim().toLowerCase();
  return isValidStepKey(s) ? s : "intake";
}

const LOCKED_STEP_KEYS: ReadonlySet<CaseStepKey> = new Set([
  "authorization",
  "documents",
  "review",
  "submitted",
  "done",
]);

export function isLockedStepKey(stepKey: string): boolean {
  const normalized = normalizeStepKey(stepKey);
  return LOCKED_STEP_KEYS.has(normalized);
}

export function stepsForCaseType(): StepDef[] {
  return [
    { key: "intake", label: "Intake" },
    { key: "eligibility", label: "Eligibility" },
    { key: "result", label: "Result" },
    { key: "checkout", label: "Checkout" },
    { key: "authorization", label: "Authorization" },
    { key: "documents", label: "Documents" },
    { key: "review", label: "Review" },
    { key: "submitted", label: "Submitted" },
    { key: "done", label: "Done" },
  ];
}

export function getCurrentAndNextStep(
  steps: StepDef[],
  currentKey: string
): { current: StepDef; next: StepDef } {
  const fallback: StepDef = steps[0] ?? { key: "intake", label: "Intake" };

  const idxRaw = steps.findIndex((x) => x.key === currentKey);
  const idx = idxRaw >= 0 ? idxRaw : 0;

  const current: StepDef = steps[idx] ?? fallback;
  const next: StepDef = steps[Math.min(idx + 1, steps.length - 1)] ?? current;

  return { current, next };
}
