import type { SubsidySlug } from "./types";

export type WizardFieldType = "toggle" | "number" | "currency" | "select";

export type WizardOption = {
  value: string;
  labelKey: string;
  descriptionKey?: string;
};

export type WizardField = {
  id: string;
  type: WizardFieldType;
  labelKey: string;
  hintKey?: string;
  options?: WizardOption[];
};

export type WizardStep = {
  key: string;
  titleKey: string;
  descriptionKey?: string;
  fields: WizardField[];
};

const COMMON_YN_OPTIONS: WizardOption[] = [
  { value: "yes", labelKey: "wizard.common.yes" },
  { value: "no", labelKey: "wizard.common.no" },
];

export const WIZARD_STEPS_BY_SLUG: Record<SubsidySlug, WizardStep[]> = {
  huurtoeslag: [
    {
      key: "base",
      titleKey: "wizard.huurtoeslag.steps.base.title",
      descriptionKey: "wizard.huurtoeslag.steps.base.description",
      fields: [
        { id: "livesInRent", type: "toggle", labelKey: "wizard.huurtoeslag.fields.livesInRent", options: COMMON_YN_OPTIONS },
        { id: "age", type: "number", labelKey: "wizard.common.fields.age" },
        { id: "hasPartner", type: "toggle", labelKey: "wizard.common.fields.hasPartner", options: COMMON_YN_OPTIONS },
        { id: "householdSize", type: "number", labelKey: "wizard.huurtoeslag.fields.householdSize" },
        {
          id: "under21HasChildOrDisability",
          type: "toggle",
          labelKey: "wizard.huurtoeslag.fields.under21HasChildOrDisability",
          options: COMMON_YN_OPTIONS,
        },
      ],
    },
    {
      key: "income",
      titleKey: "wizard.common.steps.income.title",
      descriptionKey: "wizard.common.steps.income.description",
      fields: [
        { id: "incomeSelf", type: "currency", labelKey: "wizard.common.fields.incomeSelf" },
        { id: "incomePartner", type: "currency", labelKey: "wizard.common.fields.incomePartner" },
      ],
    },
    {
      key: "rent",
      titleKey: "wizard.huurtoeslag.steps.rent.title",
      descriptionKey: "wizard.huurtoeslag.steps.rent.description",
      fields: [
        { id: "rent", type: "currency", labelKey: "wizard.huurtoeslag.fields.rent" },
        { id: "serviceCosts", type: "currency", labelKey: "wizard.huurtoeslag.fields.serviceCosts" },
      ],
    },
  ],
  zorgtoeslag: [
    {
      key: "insurance",
      titleKey: "wizard.zorgtoeslag.steps.insurance.title",
      descriptionKey: "wizard.zorgtoeslag.steps.insurance.description",
      fields: [
        {
          id: "hasBasicInsurance",
          type: "toggle",
          labelKey: "wizard.zorgtoeslag.fields.hasBasicInsurance",
          options: COMMON_YN_OPTIONS,
        },
        { id: "hasPartner", type: "toggle", labelKey: "wizard.common.fields.hasPartner", options: COMMON_YN_OPTIONS },
      ],
    },
    {
      key: "income",
      titleKey: "wizard.common.steps.income.title",
      descriptionKey: "wizard.common.steps.income.description",
      fields: [
        { id: "incomeSelf", type: "currency", labelKey: "wizard.common.fields.incomeSelf" },
        { id: "incomePartner", type: "currency", labelKey: "wizard.common.fields.incomePartner" },
      ],
    },
  ],
  kgb: [
    {
      key: "family",
      titleKey: "wizard.kgb.steps.family.title",
      descriptionKey: "wizard.kgb.steps.family.description",
      fields: [
        { id: "childrenCount", type: "number", labelKey: "wizard.kgb.fields.childrenCount" },
        { id: "childrenCount12To15", type: "number", labelKey: "wizard.kgb.fields.childrenCount12To15" },
        { id: "childrenCount16To17", type: "number", labelKey: "wizard.kgb.fields.childrenCount16To17" },
        { id: "hasPartner", type: "toggle", labelKey: "wizard.common.fields.hasPartner", options: COMMON_YN_OPTIONS },
      ],
    },
    {
      key: "income",
      titleKey: "wizard.common.steps.income.title",
      descriptionKey: "wizard.common.steps.income.description",
      fields: [{ id: "incomeHousehold", type: "currency", labelKey: "wizard.common.fields.incomeHousehold" }],
    },
  ],
  kot: [
    {
      key: "children",
      titleKey: "wizard.kot.steps.children.title",
      descriptionKey: "wizard.kot.steps.children.description",
      fields: [
        { id: "childrenCount", type: "number", labelKey: "wizard.kot.fields.childrenCount" },
      ],
    },
    {
      key: "costs",
      titleKey: "wizard.kot.steps.costs.title",
      descriptionKey: "wizard.kot.steps.costs.description",
      fields: [
        { id: "hoursPerMonth", type: "number", labelKey: "wizard.kot.fields.hoursPerMonth" },
        { id: "costPerHour", type: "currency", labelKey: "wizard.kot.fields.costPerHour" },
      ],
    },
    {
      key: "work",
      titleKey: "wizard.kot.steps.work.title",
      descriptionKey: "wizard.kot.steps.work.description",
      fields: [
        { id: "worksOrStudies", type: "toggle", labelKey: "wizard.kot.fields.worksOrStudies", options: COMMON_YN_OPTIONS },
        { id: "partnerWorksOrStudies", type: "toggle", labelKey: "wizard.kot.fields.partnerWorksOrStudies", options: COMMON_YN_OPTIONS },
        { id: "workedMonths", type: "number", labelKey: "wizard.kot.fields.workedMonths" },
      ],
    },
    {
      key: "income",
      titleKey: "wizard.common.steps.income.title",
      descriptionKey: "wizard.common.steps.income.description",
      fields: [{ id: "incomeHousehold", type: "currency", labelKey: "wizard.common.fields.incomeHousehold" }],
    },
  ],
};

