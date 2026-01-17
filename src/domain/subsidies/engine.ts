import type { SubsidyPolicy2026 } from "./policy";
import type { EligibilityResult, SubsidySlug } from "./types";

export type HuurtoeslagInput = {
  livesInRent: boolean;
  age: number | null;
  hasPartner: boolean;
  incomeSelf: number | null;
  incomePartner: number | null;
  rent: number | null;
  serviceCosts: number | null;
};

export type ZorgtoeslagInput = {
  hasBasicInsurance: boolean;
  hasPartner: boolean;
  incomeSelf: number | null;
  incomePartner: number | null;
};

export type KgbInput = {
  childrenCount: number | null;
  hasPartner: boolean;
  incomeHousehold: number | null;
};

export type KotInput = {
  childrenCount: number | null;
  childcareType: "dagopvang" | "bso" | "gastouder" | null;
  hoursPerMonth: number | null;
  costPerHour: number | null;
  worksOrStudies: boolean;
  partnerWorksOrStudies: boolean;
  incomeHousehold: number | null;
};

function isPositiveNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeIncome(value: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

export function evaluateHuurtoeslag2026(
  input: HuurtoeslagInput,
  policy: SubsidyPolicy2026
): EligibilityResult {
  const blockingReasons: string[] = [];
  const reasons: string[] = [];

  if (!input.livesInRent) blockingReasons.push("engine.huurtoeslag.notRenting");
  if (!isPositiveNumber(input.age) || input.age < policy.huurtoeslag.minAge) {
    blockingReasons.push("engine.huurtoeslag.ageTooLow");
  }

  const incomeSelf = normalizeIncome(input.incomeSelf);
  const incomePartner = normalizeIncome(input.incomePartner);
  if (incomeSelf === null) blockingReasons.push("engine.common.missingIncome");

  const totalIncome = (incomeSelf ?? 0) + (incomePartner ?? 0);
  const maxIncome = input.hasPartner ? policy.huurtoeslag.maxIncomePartner : policy.huurtoeslag.maxIncomeSingle;
  if (totalIncome > maxIncome) blockingReasons.push("engine.huurtoeslag.incomeTooHigh");

  if (!isPositiveNumber(input.rent)) blockingReasons.push("engine.common.missingRent");

  if (blockingReasons.length === 0) {
    reasons.push("engine.common.eligibleIncomeOk");
    reasons.push("engine.huurtoeslag.eligibleRentOk");
  }

  return {
    eligible: blockingReasons.length === 0,
    reasons,
    blockingReasons,
  };
}

export function evaluateZorgtoeslag2026(
  input: ZorgtoeslagInput,
  policy: SubsidyPolicy2026
): EligibilityResult {
  const blockingReasons: string[] = [];
  const reasons: string[] = [];

  if (!input.hasBasicInsurance) blockingReasons.push("engine.zorgtoeslag.noBasicInsurance");

  const incomeSelf = normalizeIncome(input.incomeSelf);
  const incomePartner = normalizeIncome(input.incomePartner);
  if (incomeSelf === null) blockingReasons.push("engine.common.missingIncome");

  const totalIncome = (incomeSelf ?? 0) + (incomePartner ?? 0);
  const maxIncome = input.hasPartner ? policy.zorgtoeslag.maxIncomePartner : policy.zorgtoeslag.maxIncomeSingle;
  if (totalIncome > maxIncome) blockingReasons.push("engine.zorgtoeslag.incomeTooHigh");

  if (blockingReasons.length === 0) {
    reasons.push("engine.common.eligibleIncomeOk");
    reasons.push("engine.zorgtoeslag.eligibleInsuranceOk");
  }

  return {
    eligible: blockingReasons.length === 0,
    reasons,
    blockingReasons,
  };
}

export function evaluateKGB2026(input: KgbInput, policy: SubsidyPolicy2026): EligibilityResult {
  const blockingReasons: string[] = [];
  const reasons: string[] = [];

  if (!isPositiveNumber(input.childrenCount) || input.childrenCount < policy.kgb.minChildren) {
    blockingReasons.push("engine.kgb.noChildren");
  }

  const incomeHousehold = normalizeIncome(input.incomeHousehold);
  if (incomeHousehold === null) blockingReasons.push("engine.common.missingIncome");

  if (incomeHousehold !== null && incomeHousehold > policy.kgb.maxIncomeHousehold) {
    blockingReasons.push("engine.kgb.incomeTooHigh");
  }

  if (blockingReasons.length === 0) {
    reasons.push("engine.common.eligibleIncomeOk");
    reasons.push("engine.kgb.eligibleChildrenOk");
  }

  return {
    eligible: blockingReasons.length === 0,
    reasons,
    blockingReasons,
  };
}

export function evaluateKOT2026(input: KotInput, policy: SubsidyPolicy2026): EligibilityResult {
  const blockingReasons: string[] = [];
  const reasons: string[] = [];

  if (!isPositiveNumber(input.childrenCount) || input.childrenCount < policy.kot.minChildren) {
    blockingReasons.push("engine.kot.noChildren");
  }

  if (!isPositiveNumber(input.hoursPerMonth) || !isPositiveNumber(input.costPerHour)) {
    blockingReasons.push("engine.kot.noChildcareCosts");
  }

  if (!input.worksOrStudies || (input.partnerWorksOrStudies === false && input.partnerWorksOrStudies !== undefined)) {
    if (!input.worksOrStudies) {
      blockingReasons.push("engine.kot.noWorkOrStudy");
    }
  }

  const incomeHousehold = normalizeIncome(input.incomeHousehold);
  if (incomeHousehold === null) blockingReasons.push("engine.common.missingIncome");

  if (incomeHousehold !== null && incomeHousehold > policy.kot.maxIncomeHousehold) {
    blockingReasons.push("engine.kot.incomeTooHigh");
  }

  if (blockingReasons.length === 0) {
    reasons.push("engine.common.eligibleIncomeOk");
    reasons.push("engine.kot.eligibleChildcareOk");
  }

  return {
    eligible: blockingReasons.length === 0,
    reasons,
    blockingReasons,
  };
}

export function evaluateSubsidyEligibility(
  slug: SubsidySlug,
  payload: HuurtoeslagInput | ZorgtoeslagInput | KgbInput | KotInput,
  policy: SubsidyPolicy2026
): EligibilityResult {
  switch (slug) {
    case "huurtoeslag":
      return evaluateHuurtoeslag2026(payload as HuurtoeslagInput, policy);
    case "zorgtoeslag":
      return evaluateZorgtoeslag2026(payload as ZorgtoeslagInput, policy);
    case "kgb":
      return evaluateKGB2026(payload as KgbInput, policy);
    case "kot":
      return evaluateKOT2026(payload as KotInput, policy);
    default:
      return { eligible: false, reasons: [], blockingReasons: ["engine.common.invalidSlug"] };
  }
}

