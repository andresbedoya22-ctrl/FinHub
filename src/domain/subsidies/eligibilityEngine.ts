import type { SubsidyPolicy2026 } from "./policy";
import type { EligibilityResult, SubsidySlug } from "./types";
import {
  evaluateHuurtoeslag2026,
  evaluateZorgtoeslag2026,
  evaluateKGB2026,
  evaluateKOT2026,
  evaluateSubsidyEligibility as evaluateSubsidyEligibility2026,
  type HuurtoeslagInput,
  type ZorgtoeslagInput,
  type KgbInput,
  type KotInput,
} from "./engine";

export type { HuurtoeslagInput, ZorgtoeslagInput, KgbInput, KotInput };

export function evaluateHuurtoeslag(input: HuurtoeslagInput, policy: SubsidyPolicy2026): EligibilityResult {
  return evaluateHuurtoeslag2026(input, policy);
}

export function evaluateZorgtoeslag(input: ZorgtoeslagInput, policy: SubsidyPolicy2026): EligibilityResult {
  return evaluateZorgtoeslag2026(input, policy);
}

export function evaluateKgb(input: KgbInput, policy: SubsidyPolicy2026): EligibilityResult {
  return evaluateKGB2026(input, policy);
}

export function evaluateKot(input: KotInput, policy: SubsidyPolicy2026): EligibilityResult {
  return evaluateKOT2026(input, policy);
}

export function evaluateSubsidyEligibility(
  slug: SubsidySlug,
  payload: HuurtoeslagInput | ZorgtoeslagInput | KgbInput | KotInput,
  policy: SubsidyPolicy2026
): EligibilityResult {
  return evaluateSubsidyEligibility2026(slug, payload, policy);
}
