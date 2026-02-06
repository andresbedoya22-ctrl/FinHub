import type { CaseStepKey, CaseType } from "./casesTypes";

export type CaseStep = {
  key: CaseStepKey;
  label: string;
};

const GENERIC_STEPS: CaseStep[] = [
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

export function stepsForCaseType(): CaseStep[] {
  return GENERIC_STEPS;
}

export function initialStepKeyForType(type: CaseType): CaseStepKey {
  return type === "toeslagen" ? "eligibility" : "intake";
}

export function defaultTitleForCaseType(type: CaseType): string {
  switch (type) {
    case "toeslagen":
      return "Toeslagen case";
    case "taxes":
      return "Taxes case";
    case "mortgage":
      return "Mortgage case";
    case "credit":
      return "Credit case";
    case "insurance":
      return "Insurance case";
    default:
      return "Case";
  }
}
