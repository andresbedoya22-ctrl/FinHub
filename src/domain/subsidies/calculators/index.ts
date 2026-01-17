import { getCalculationParams } from "./params";
import { calculateZorgtoeslag2026 } from "./zorgtoeslag2026";
import { calculateHuurtoeslag2026 } from "./huurtoeslag2026";
import { calculateKgb2026 } from "./kgb2026";
import { calculateKot2026 } from "./kot2026";
import type {
  BenefitEstimate,
  CalculationYear,
  HuurtoeslagInput,
  KgbInput,
  KotInput,
  ZorgtoeslagInput,
} from "./types";

export type {
  BenefitEstimate,
  CalculationYear,
  HuurtoeslagInput,
  KgbInput,
  KotInput,
  ZorgtoeslagInput,
};

type InputBySlug =
  | { slug: "huurtoeslag"; input: HuurtoeslagInput }
  | { slug: "zorgtoeslag"; input: ZorgtoeslagInput }
  | { slug: "kgb"; input: KgbInput }
  | { slug: "kot"; input: KotInput };

export function calculateSubsidyBenefit(
  payload: InputBySlug,
  year: CalculationYear,
  eligible: boolean
): BenefitEstimate {
  if (!eligible) {
    return {
      currency: "EUR",
      breakdownKeys: [],
      assumptionsKeys: [],
      explanationKey: "result.benefit.notEligible",
    };
  }

  const params = getCalculationParams(year);
  switch (payload.slug) {
    case "zorgtoeslag":
      return calculateZorgtoeslag2026(payload.input, params);
    case "huurtoeslag":
      return calculateHuurtoeslag2026(payload.input, params);
    case "kgb":
      return calculateKgb2026(payload.input, params);
    case "kot":
      return calculateKot2026(payload.input, params);
    default:
      return {
        currency: "EUR",
        breakdownKeys: [],
        assumptionsKeys: [],
        explanationKey: "result.benefit.notAvailableDescription",
      };
  }
}
