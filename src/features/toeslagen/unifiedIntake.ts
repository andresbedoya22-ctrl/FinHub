import { calculateSubsidyBenefit } from "../../domain/subsidies/calculators";
import type {
  HuurtoeslagInput as HuurEligibilityInput,
  KgbInput as KgbEligibilityInput,
  KotInput as KotEligibilityInput,
  ZorgtoeslagInput as ZorgEligibilityInput,
} from "../../domain/subsidies/eligibilityEngine";
import { evaluateSubsidyEligibility } from "../../domain/subsidies/eligibilityEngine";
import { SUBSIDY_DOCS_BY_SLUG, type SubsidyDocKey } from "../../domain/subsidies/registry";
import { DEFAULT_POLICY_2026 } from "../../domain/subsidies/policy";
import type { SubsidySlug } from "../../domain/subsidies/types";

export type UnifiedToeslagenIntakeInput = {
  livesInNetherlands: boolean;
  registeredAtAddress: boolean;
  hasDutchNationalityOrValidPermit: boolean;
  age: number | null;
  hasPartner: boolean;
  incomeSelf: number | null;
  incomePartner: number | null;
  assetsHousehold: number | null;
  highestCoResidentAssets: number | null;
  rentsIndependentHome: boolean;
  hasLeaseContract: boolean;
  paysRentByBankTransfer: boolean;
  rent: number | null;
  serviceCosts: number | null;
  hasBasicInsurance: boolean;
  childrenCount: number | null;
  receivesChildBenefit: boolean;
  childLivesAtRegisteredAddress: boolean;
  usesRegisteredChildcareProvider: boolean;
  childcareType: "dagopvang" | "bso" | "gastouder" | null;
  childcareHoursPerMonth: number | null;
  childcareCostPerHour: number | null;
  worksOrStudies: boolean;
  partnerWorksOrStudies: boolean;
};

export type UnifiedToeslagResult = {
  slug: SubsidySlug;
  eligible: boolean;
  amountPerMonth: number | null;
  amountPerYear: number | null;
  blockingReasons: string[];
  requiredDocs: SubsidyDocKey[];
};

function numberOrNull(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const MAX_ASSETS_ZORG_KGB_SINGLE_2026 = 146_011;
const MAX_ASSETS_ZORG_KGB_PARTNER_2026 = 184_633;
const MAX_ASSETS_HUUR_SINGLE_2026 = 38_479;
const MAX_ASSETS_HUUR_PARTNER_2026 = 76_958;
const MAX_ASSETS_HUUR_CO_RESIDENT_2026 = 38_479;

function buildOfficialBlockingReasons(slug: SubsidySlug, input: UnifiedToeslagenIntakeInput): string[] {
  const reasons: string[] = [];

  if (!input.livesInNetherlands) reasons.push("official.common.notResidentNl");
  if (!input.registeredAtAddress) reasons.push("official.common.notRegisteredAddress");
  if (!input.hasDutchNationalityOrValidPermit) reasons.push("official.common.noValidResidenceRight");

  const assetsHousehold = numberOrNull(input.assetsHousehold);
  const maxAssetsGeneral = input.hasPartner ? MAX_ASSETS_ZORG_KGB_PARTNER_2026 : MAX_ASSETS_ZORG_KGB_SINGLE_2026;

  if ((slug === "zorgtoeslag" || slug === "kgb") && typeof assetsHousehold === "number" && assetsHousehold > maxAssetsGeneral) {
    reasons.push("official.common.assetsTooHigh");
  }

  if (slug === "huurtoeslag") {
    if (!input.rentsIndependentHome) reasons.push("official.huur.notIndependentHome");
    if (!input.hasLeaseContract) reasons.push("official.huur.noLeaseContract");
    if (!input.paysRentByBankTransfer) reasons.push("official.huur.noBankTransferRentProof");

    const maxAssetsHuur = input.hasPartner ? MAX_ASSETS_HUUR_PARTNER_2026 : MAX_ASSETS_HUUR_SINGLE_2026;
    if (typeof assetsHousehold === "number" && assetsHousehold > maxAssetsHuur) {
      reasons.push("official.huur.assetsTooHigh");
    }

    const coResidentAssets = numberOrNull(input.highestCoResidentAssets);
    if (typeof coResidentAssets === "number" && coResidentAssets > MAX_ASSETS_HUUR_CO_RESIDENT_2026) {
      reasons.push("official.huur.coResidentAssetsTooHigh");
    }
  }

  if (slug === "kgb") {
    if (!input.receivesChildBenefit) reasons.push("official.kgb.noChildBenefit");
  }

  if (slug === "kot") {
    if (!input.usesRegisteredChildcareProvider) reasons.push("official.kot.unregisteredChildcareProvider");
    if (!input.childLivesAtRegisteredAddress) reasons.push("official.kot.childNotAtRegisteredAddress");
    if (input.hasPartner && !input.partnerWorksOrStudies) reasons.push("official.kot.partnerNotWorkingOrStudying");
  }

  return reasons;
}

export function evaluateUnifiedToeslagenIntake(input: UnifiedToeslagenIntakeInput): UnifiedToeslagResult[] {
  const incomeSelf = numberOrNull(input.incomeSelf);
  const incomePartner = numberOrNull(input.incomePartner);
  const incomeHousehold = (incomeSelf ?? 0) + (incomePartner ?? 0);
  const childrenCount = numberOrNull(input.childrenCount);

  const evaluations: Array<
    | {
        slug: "huurtoeslag";
        eligibilityPayload: HuurEligibilityInput;
        calculatorPayload: {
          age: number | null;
          hasPartner: boolean;
          householdSize: number | null;
          annualIncomeApplicant: number | null;
          annualIncomePartner: number | null;
          monthlyRent: number | null;
          monthlyServiceCosts: number | null;
          under21HasChildOrDisability: boolean;
        };
      }
    | {
        slug: "zorgtoeslag";
        eligibilityPayload: ZorgEligibilityInput;
        calculatorPayload: {
          hasPartner: boolean;
          annualIncomeApplicant: number | null;
          annualIncomePartner: number | null;
        };
      }
    | {
        slug: "kgb";
        eligibilityPayload: KgbEligibilityInput;
        calculatorPayload: {
          hasPartner: boolean;
          annualIncomeHousehold: number | null;
          childrenCount: number | null;
          childrenCount12To15: number | null;
          childrenCount16To17: number | null;
        };
      }
    | {
        slug: "kot";
        eligibilityPayload: KotEligibilityInput;
        calculatorPayload: {
          annualIncomeHousehold: number | null;
          workedMonths: number | null;
          children: Array<{
            hoursPerMonth: number | null;
            hourlyRate: number | null;
            childcareType: "dagopvang" | "bso" | "gastouder" | null;
          }>;
        };
      }
  > = [
    {
      slug: "huurtoeslag",
      eligibilityPayload: {
        livesInRent: true,
        age: numberOrNull(input.age),
        hasPartner: input.hasPartner,
        incomeSelf,
        incomePartner,
        rent: numberOrNull(input.rent),
        serviceCosts: numberOrNull(input.serviceCosts),
      },
      calculatorPayload: {
        age: numberOrNull(input.age),
        hasPartner: input.hasPartner,
        householdSize: input.hasPartner ? 2 : 1,
        annualIncomeApplicant: incomeSelf,
        annualIncomePartner: incomePartner,
        monthlyRent: numberOrNull(input.rent),
        monthlyServiceCosts: numberOrNull(input.serviceCosts),
        under21HasChildOrDisability: (numberOrNull(input.age) ?? 0) < 21 && (childrenCount ?? 0) > 0,
      },
    },
    {
      slug: "zorgtoeslag",
      eligibilityPayload: {
        hasBasicInsurance: input.hasBasicInsurance,
        hasPartner: input.hasPartner,
        incomeSelf,
        incomePartner,
      },
      calculatorPayload: {
        hasPartner: input.hasPartner,
        annualIncomeApplicant: incomeSelf,
        annualIncomePartner: incomePartner,
      },
    },
    {
      slug: "kgb",
      eligibilityPayload: {
        childrenCount,
        hasPartner: input.hasPartner,
        incomeHousehold,
      },
      calculatorPayload: {
        hasPartner: input.hasPartner,
        annualIncomeHousehold: incomeHousehold,
        childrenCount,
        childrenCount12To15: null,
        childrenCount16To17: null,
      },
    },
    {
      slug: "kot",
      eligibilityPayload: {
        childrenCount,
        childcareType: input.childcareType,
        hoursPerMonth: numberOrNull(input.childcareHoursPerMonth),
        costPerHour: numberOrNull(input.childcareCostPerHour),
        worksOrStudies: input.worksOrStudies,
        partnerWorksOrStudies: input.partnerWorksOrStudies,
        incomeHousehold,
      },
      calculatorPayload: {
        annualIncomeHousehold: incomeHousehold,
        workedMonths: 12,
        children:
          (childrenCount ?? 0) > 0
            ? [
                {
                  hoursPerMonth: numberOrNull(input.childcareHoursPerMonth),
                  hourlyRate: numberOrNull(input.childcareCostPerHour),
                  childcareType: input.childcareType,
                },
              ]
            : [],
      },
    },
  ];

  return evaluations.map(({ slug, eligibilityPayload, calculatorPayload }) => {
    const eligibility = evaluateSubsidyEligibility(slug, eligibilityPayload, DEFAULT_POLICY_2026);
    const officialBlockingReasons = buildOfficialBlockingReasons(slug, input);

    const benefit =
      slug === "huurtoeslag"
        ? calculateSubsidyBenefit({ slug, input: calculatorPayload }, 2026, eligibility.eligible)
        : slug === "zorgtoeslag"
          ? calculateSubsidyBenefit({ slug, input: calculatorPayload }, 2026, eligibility.eligible)
          : slug === "kgb"
            ? calculateSubsidyBenefit({ slug, input: calculatorPayload }, 2026, eligibility.eligible)
            : calculateSubsidyBenefit({ slug, input: calculatorPayload }, 2026, eligibility.eligible);

    return {
      slug,
      eligible: eligibility.eligible && officialBlockingReasons.length === 0,
      amountPerMonth: typeof benefit.monthlyCents === "number" ? benefit.monthlyCents / 100 : null,
      amountPerYear: typeof benefit.yearlyCents === "number" ? benefit.yearlyCents / 100 : null,
      blockingReasons: Array.from(new Set([...eligibility.blockingReasons, ...officialBlockingReasons])),
      requiredDocs: SUBSIDY_DOCS_BY_SLUG[slug],
    };
  });
}
