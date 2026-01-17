export type CalculationYear = 2025 | 2026 | 2027;

export type BenefitEstimate = {
  currency: "EUR";
  monthlyCents?: number;
  yearlyCents?: number;
  range?: { minCents: number; maxCents: number };
  explanationKey?: string;
  missingInputs?: string[];
  breakdownKeys: string[];
  breakdownItems?: { labelKey: string; amountCents: number; labelValues?: Record<string, string | number> }[];
  assumptionsKeys: string[];
};

export type HuurtoeslagInput = {
  age: number | null;
  hasPartner: boolean;
  householdSize: number | null;
  annualIncomeApplicant: number | null;
  annualIncomePartner: number | null;
  monthlyRent: number | null;
  monthlyServiceCosts?: number | null;
  under21HasChildOrDisability: boolean;
};

export type ZorgtoeslagInput = {
  hasPartner: boolean;
  annualIncomeApplicant: number | null;
  annualIncomePartner: number | null;
};

export type KgbInput = {
  hasPartner: boolean;
  annualIncomeHousehold: number | null;
  childrenCount: number | null;
  childrenCount12To15: number | null;
  childrenCount16To17: number | null;
};

export type KotChildInput = {
  hoursPerMonth: number | null;
  hourlyRate: number | null;
  childcareType: "dagopvang" | "bso" | "gastouder" | null;
};

export type KotInput = {
  annualIncomeHousehold: number | null;
  workedMonths: number | null;
  children: KotChildInput[];
};
