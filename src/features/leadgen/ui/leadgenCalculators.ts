export type IncomePeriod = "monthly" | "annual";

export type MortgageBuyerInput = {
  grossIncome: number;
  incomePeriod: IncomePeriod;
  birthDate: string;
  selfEmployed: boolean;
};

export type MortgageEstimate = {
  annualHouseholdIncome: number;
  oldestAge: number;
  maxMortgage: number;
  selfEmployedCount: number;
};

export type CreditSimulation = {
  principal: number;
  termMonths: number;
  annualRatePct: number;
  monthlyInstallment: number;
  totalRepayable: number;
  totalInterest: number;
};

export const DEFAULT_CREDIT_INTEREST_RATE_PCT = 5;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function normalizeAnnualIncome(value: number, period: IncomePeriod): number {
  const sanitized = Number.isFinite(value) ? Math.max(0, value) : 0;
  return period === "monthly" ? sanitized * 12 : sanitized;
}

export function ageFromBirthDate(birthDate: string, today = new Date()): number {
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return 30;

  const years = today.getFullYear() - parsed.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > parsed.getMonth() ||
    (today.getMonth() === parsed.getMonth() && today.getDate() >= parsed.getDate());

  return clamp(hasBirthdayPassed ? years : years - 1, 18, 75);
}

export function estimateMortgageCapacity(
  buyers: MortgageBuyerInput[],
  hasOwnFunds: boolean,
  today = new Date()
): MortgageEstimate {
  const normalizedBuyers: MortgageBuyerInput[] = buyers.length > 0
    ? buyers
    : [{ grossIncome: 0, incomePeriod: "monthly", birthDate: "", selfEmployed: false }];

  const annualHouseholdIncome = normalizedBuyers.reduce((acc, buyer) => {
    return acc + normalizeAnnualIncome(buyer.grossIncome, buyer.incomePeriod);
  }, 0);

  const oldestAge = normalizedBuyers.reduce((age, buyer) => {
    return Math.max(age, ageFromBirthDate(buyer.birthDate, today));
  }, 18);

  const selfEmployedCount = normalizedBuyers.reduce((acc, buyer) => acc + (buyer.selfEmployed ? 1 : 0), 0);

  const ageFactor = oldestAge <= 29 ? 4.85 : oldestAge <= 39 ? 4.6 : oldestAge <= 49 ? 4.25 : 3.9;
  const fundsFactor = hasOwnFunds ? 1.05 : 1;
  const selfEmploymentPenalty = selfEmployedCount > 0 ? 0.92 : 1;

  const maxMortgage = Math.round(annualHouseholdIncome * ageFactor * fundsFactor * selfEmploymentPenalty);

  return {
    annualHouseholdIncome,
    oldestAge,
    maxMortgage: Math.max(0, maxMortgage),
    selfEmployedCount,
  };
}

export function estimateCreditSimulation(input: {
  amount: number;
  termMonths: number;
  annualRatePct?: number;
}): CreditSimulation {
  const principal = Math.max(0, Number(input.amount) || 0);
  const termMonths = clamp(Math.round(Number(input.termMonths) || 0), 6, 120);
  const annualRatePct = clamp(
    Number.isFinite(input.annualRatePct) ? Number(input.annualRatePct) : DEFAULT_CREDIT_INTEREST_RATE_PCT,
    0,
    29.99
  );

  if (principal <= 0) {
    return {
      principal,
      termMonths,
      annualRatePct,
      monthlyInstallment: 0,
      totalRepayable: 0,
      totalInterest: 0,
    };
  }

  const monthlyRate = annualRatePct / 12 / 100;
  const monthlyInstallment =
    monthlyRate <= 0
      ? principal / termMonths
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));

  const totalRepayable = monthlyInstallment * termMonths;
  const totalInterest = totalRepayable - principal;

  return {
    principal,
    termMonths,
    annualRatePct,
    monthlyInstallment: Math.round(monthlyInstallment * 100) / 100,
    totalRepayable: Math.round(totalRepayable * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
  };
}

export function getDefaultCreditInterestRatePct(): number {
  return DEFAULT_CREDIT_INTEREST_RATE_PCT;
}

export type InsuranceRiskInput = {
  productType: "vehicle" | "home" | "life" | "business";
  assetValue: number;
  birthDate: string;
  noClaimsYears?: number;
};

export function estimateInsurancePremium(input: InsuranceRiskInput): number {
  const assetValue = Math.max(1_000, Number(input.assetValue) || 0);
  const age = ageFromBirthDate(input.birthDate);
  const noClaims = clamp(Math.round(Number(input.noClaimsYears) || 0), 0, 30);

  const basePct =
    input.productType === "vehicle" ? 0.013 :
    input.productType === "home" ? 0.0021 :
    input.productType === "life" ? 0.0015 : 0.0042;

  const ageFactor = age <= 24 ? 1.25 : age <= 35 ? 1.04 : age <= 60 ? 1 : 1.12;
  const noClaimsFactor = input.productType === "vehicle" ? Math.max(0.62, 1 - noClaims * 0.025) : 1;

  const annual = assetValue * basePct * ageFactor * noClaimsFactor;
  return Math.max(6, Math.round((annual / 12) * 100) / 100);
}

export function mapIncomeBand(annualIncome: number): "lt_25k" | "25_50k" | "50_90k" | "90k_plus" {
  if (annualIncome < 25_000) return "lt_25k";
  if (annualIncome < 50_000) return "25_50k";
  if (annualIncome < 90_000) return "50_90k";
  return "90k_plus";
}
