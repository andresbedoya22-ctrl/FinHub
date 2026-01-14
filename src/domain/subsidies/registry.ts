import type { SubsidySlug } from "./types";
export type { SubsidySlug } from "./types";

export type SubsidyIcon = "home" | "health" | "kids" | "childcare";

export type SubsidyDocKey =
  | "huurcontract"
  | "rent_service_costs"
  | "proof_income"
  | "id"
  | "health_insurance"
  | "partner_income"
  | "children_birth"
  | "childcare_contract"
  | "childcare_invoice"
  | "work_or_study_proof"
  | "household_composition";

export type SubsidyMetric = {
  labelKey: string;
  valueKey: string;
};

export type SubsidyRegistryEntry = {
  slug: SubsidySlug;
  icon: SubsidyIcon;
  catalog: {
    titleKey: string;
    descriptionKey: string;
    coverageKey: string;
    audienceKey: string;
    timelineKey: string;
  };
  detail: {
    titleKey: string;
    subtitleKey: string;
    whatIsKey: string;
    coverageKey: string;
    benefitsKeys: string[];
    requirementsKeys: string[];
    needsKeys: string[];
  };
  metrics: SubsidyMetric[];
  facts: SubsidyMetric[];
};

export const SUBSIDIES: SubsidyRegistryEntry[] = [
  {
    slug: "huurtoeslag",
    icon: "home",
    catalog: {
      titleKey: "catalog.huurtoeslag.title",
      descriptionKey: "catalog.huurtoeslag.description",
      coverageKey: "catalog.huurtoeslag.coverage",
      audienceKey: "catalog.huurtoeslag.audience",
      timelineKey: "catalog.huurtoeslag.timeline",
    },
    detail: {
      titleKey: "detail.huurtoeslag.title",
      subtitleKey: "detail.huurtoeslag.subtitle",
      whatIsKey: "detail.huurtoeslag.whatIs",
      coverageKey: "detail.huurtoeslag.coverage",
      benefitsKeys: [
        "detail.huurtoeslag.benefits.1",
        "detail.huurtoeslag.benefits.2",
      ],
      requirementsKeys: [
        "detail.huurtoeslag.requirements.1",
        "detail.huurtoeslag.requirements.2",
        "detail.huurtoeslag.requirements.3",
        "detail.huurtoeslag.requirements.4",
      ],
      needsKeys: [
        "detail.huurtoeslag.needs.1",
        "detail.huurtoeslag.needs.2",
        "detail.huurtoeslag.needs.3",
        "detail.huurtoeslag.needs.4",
      ],
    },
    metrics: [
      { labelKey: "metrics.huurtoeslag.primary.label", valueKey: "metrics.huurtoeslag.primary.value" },
      { labelKey: "metrics.huurtoeslag.secondary.label", valueKey: "metrics.huurtoeslag.secondary.value" },
      { labelKey: "metrics.huurtoeslag.tertiary.label", valueKey: "metrics.huurtoeslag.tertiary.value" },
    ],
    facts: [
      { labelKey: "facts.huurtoeslag.1.label", valueKey: "facts.huurtoeslag.1.value" },
      { labelKey: "facts.huurtoeslag.2.label", valueKey: "facts.huurtoeslag.2.value" },
      { labelKey: "facts.huurtoeslag.3.label", valueKey: "facts.huurtoeslag.3.value" },
    ],
  },
  {
    slug: "zorgtoeslag",
    icon: "health",
    catalog: {
      titleKey: "catalog.zorgtoeslag.title",
      descriptionKey: "catalog.zorgtoeslag.description",
      coverageKey: "catalog.zorgtoeslag.coverage",
      audienceKey: "catalog.zorgtoeslag.audience",
      timelineKey: "catalog.zorgtoeslag.timeline",
    },
    detail: {
      titleKey: "detail.zorgtoeslag.title",
      subtitleKey: "detail.zorgtoeslag.subtitle",
      whatIsKey: "detail.zorgtoeslag.whatIs",
      coverageKey: "detail.zorgtoeslag.coverage",
      benefitsKeys: [
        "detail.zorgtoeslag.benefits.1",
        "detail.zorgtoeslag.benefits.2",
      ],
      requirementsKeys: [
        "detail.zorgtoeslag.requirements.1",
        "detail.zorgtoeslag.requirements.2",
        "detail.zorgtoeslag.requirements.3",
      ],
      needsKeys: [
        "detail.zorgtoeslag.needs.1",
        "detail.zorgtoeslag.needs.2",
        "detail.zorgtoeslag.needs.3",
      ],
    },
    metrics: [
      { labelKey: "metrics.zorgtoeslag.primary.label", valueKey: "metrics.zorgtoeslag.primary.value" },
      { labelKey: "metrics.zorgtoeslag.secondary.label", valueKey: "metrics.zorgtoeslag.secondary.value" },
      { labelKey: "metrics.zorgtoeslag.tertiary.label", valueKey: "metrics.zorgtoeslag.tertiary.value" },
    ],
    facts: [
      { labelKey: "facts.zorgtoeslag.1.label", valueKey: "facts.zorgtoeslag.1.value" },
      { labelKey: "facts.zorgtoeslag.2.label", valueKey: "facts.zorgtoeslag.2.value" },
      { labelKey: "facts.zorgtoeslag.3.label", valueKey: "facts.zorgtoeslag.3.value" },
    ],
  },
  {
    slug: "kgb",
    icon: "kids",
    catalog: {
      titleKey: "catalog.kgb.title",
      descriptionKey: "catalog.kgb.description",
      coverageKey: "catalog.kgb.coverage",
      audienceKey: "catalog.kgb.audience",
      timelineKey: "catalog.kgb.timeline",
    },
    detail: {
      titleKey: "detail.kgb.title",
      subtitleKey: "detail.kgb.subtitle",
      whatIsKey: "detail.kgb.whatIs",
      coverageKey: "detail.kgb.coverage",
      benefitsKeys: ["detail.kgb.benefits.1", "detail.kgb.benefits.2"],
      requirementsKeys: [
        "detail.kgb.requirements.1",
        "detail.kgb.requirements.2",
        "detail.kgb.requirements.3",
      ],
      needsKeys: ["detail.kgb.needs.1", "detail.kgb.needs.2", "detail.kgb.needs.3"],
    },
    metrics: [
      { labelKey: "metrics.kgb.primary.label", valueKey: "metrics.kgb.primary.value" },
      { labelKey: "metrics.kgb.secondary.label", valueKey: "metrics.kgb.secondary.value" },
      { labelKey: "metrics.kgb.tertiary.label", valueKey: "metrics.kgb.tertiary.value" },
    ],
    facts: [
      { labelKey: "facts.kgb.1.label", valueKey: "facts.kgb.1.value" },
      { labelKey: "facts.kgb.2.label", valueKey: "facts.kgb.2.value" },
      { labelKey: "facts.kgb.3.label", valueKey: "facts.kgb.3.value" },
    ],
  },
  {
    slug: "kot",
    icon: "childcare",
    catalog: {
      titleKey: "catalog.kot.title",
      descriptionKey: "catalog.kot.description",
      coverageKey: "catalog.kot.coverage",
      audienceKey: "catalog.kot.audience",
      timelineKey: "catalog.kot.timeline",
    },
    detail: {
      titleKey: "detail.kot.title",
      subtitleKey: "detail.kot.subtitle",
      whatIsKey: "detail.kot.whatIs",
      coverageKey: "detail.kot.coverage",
      benefitsKeys: ["detail.kot.benefits.1", "detail.kot.benefits.2"],
      requirementsKeys: [
        "detail.kot.requirements.1",
        "detail.kot.requirements.2",
        "detail.kot.requirements.3",
        "detail.kot.requirements.4",
      ],
      needsKeys: [
        "detail.kot.needs.1",
        "detail.kot.needs.2",
        "detail.kot.needs.3",
        "detail.kot.needs.4",
      ],
    },
    metrics: [
      { labelKey: "metrics.kot.primary.label", valueKey: "metrics.kot.primary.value" },
      { labelKey: "metrics.kot.secondary.label", valueKey: "metrics.kot.secondary.value" },
      { labelKey: "metrics.kot.tertiary.label", valueKey: "metrics.kot.tertiary.value" },
    ],
    facts: [
      { labelKey: "facts.kot.1.label", valueKey: "facts.kot.1.value" },
      { labelKey: "facts.kot.2.label", valueKey: "facts.kot.2.value" },
      { labelKey: "facts.kot.3.label", valueKey: "facts.kot.3.value" },
    ],
  },
];

export const SUBSIDY_SLUGS: SubsidySlug[] = SUBSIDIES.map((subsidy) => subsidy.slug);

export const SUBSIDY_ICON_BY_SLUG: Record<SubsidySlug, SubsidyIcon> = Object.fromEntries(
  SUBSIDIES.map((subsidy) => [subsidy.slug, subsidy.icon])
) as Record<SubsidySlug, SubsidyIcon>;

export const SUBSIDY_DOCS_BY_SLUG: Record<SubsidySlug, SubsidyDocKey[]> = {
  huurtoeslag: ["huurcontract", "rent_service_costs", "proof_income", "id", "household_composition"],
  zorgtoeslag: ["health_insurance", "proof_income", "id", "household_composition"],
  kgb: ["children_birth", "proof_income", "id", "household_composition"],
  kot: ["childcare_contract", "childcare_invoice", "work_or_study_proof", "proof_income", "id"],
};

export function getSubsidyBySlug(slug: string): SubsidyRegistryEntry | null {
  return SUBSIDIES.find((subsidy) => subsidy.slug === slug) ?? null;
}

export function isSubsidySlug(value: string): value is SubsidySlug {
  return SUBSIDY_SLUGS.includes(value as SubsidySlug);
}
