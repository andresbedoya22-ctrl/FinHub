import type { CaseStep, CaseType } from "./casesTypes";

export function stepsForCaseType(type: CaseType): CaseStep[] {
  const toeslagen: CaseStep[] = [
    { key: "eligibility", label: "Eligibility" },
    { key: "result", label: "Result" },
    { key: "checkout", label: "Checkout" },
    { key: "authorization", label: "Authorization" },
    { key: "documents", label: "Documents" },
    { key: "review", label: "Review" },
  ];

  const taxes: CaseStep[] = [
    { key: "intake", label: "Intake" },
    { key: "documents", label: "Documents" },
    { key: "review", label: "Review" },
    { key: "submission", label: "Submission" },
    { key: "done", label: "Done" },
  ];

  const finances: CaseStep[] = [
    { key: "intake", label: "Intake" },
    { key: "documents", label: "Documents" },
    { key: "review", label: "Review" },
    { key: "done", label: "Done" },
  ];

  switch (type) {
    case "toeslag_huur":
    case "toeslag_zorg":
    case "toeslag_kinderopvang":
      return toeslagen;
    case "tax_ib":
    case "tax_voorlopige_aanslag":
      return taxes;
    case "finances_intake":
    case "document_review":
    default:
      return finances;
  }
}

export function defaultTitleForCaseType(type: CaseType): string {
  switch (type) {
    case "toeslag_huur":
      return "Huurtoeslag (Case)";
    case "toeslag_zorg":
      return "Zorgtoeslag (Case)";
    case "toeslag_kinderopvang":
      return "Kinderopvangtoeslag (Case)";
    case "tax_ib":
      return "IB Aangifte (Case)";
    case "tax_voorlopige_aanslag":
      return "Voorlopige aanslag (Case)";
    case "finances_intake":
      return "Finanzas personales (Intake)";
    case "document_review":
      return "RevisiÃƒÂ³n de documentos";
    default:
      return "Case";
  }
}
