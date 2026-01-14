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
  { value: "yes", labelKey: "subsidies.wizard.common.yes" },
  { value: "no", labelKey: "subsidies.wizard.common.no" },
];

export const WIZARD_STEPS_BY_SLUG: Record<SubsidySlug, WizardStep[]> = {
  huurtoeslag: [
    {
      key: "base",
      titleKey: "subsidies.wizard.huurtoeslag.steps.base.title",
      descriptionKey: "subsidies.wizard.huurtoeslag.steps.base.description",
      fields: [
        { id: "livesInRent", type: "toggle", labelKey: "subsidies.wizard.huurtoeslag.fields.livesInRent", options: COMMON_YN_OPTIONS },
        { id: "age", type: "number", labelKey: "subsidies.wizard.common.fields.age" },
        { id: "hasPartner", type: "toggle", labelKey: "subsidies.wizard.common.fields.hasPartner", options: COMMON_YN_OPTIONS },
      ],
    },
    {
      key: "income",
      titleKey: "subsidies.wizard.common.steps.income.title",
      descriptionKey: "subsidies.wizard.common.steps.income.description",
      fields: [
        { id: "incomeSelf", type: "currency", labelKey: "subsidies.wizard.common.fields.incomeSelf" },
        { id: "incomePartner", type: "currency", labelKey: "subsidies.wizard.common.fields.incomePartner" },
      ],
    },
    {
      key: "rent",
      titleKey: "subsidies.wizard.huurtoeslag.steps.rent.title",
      descriptionKey: "subsidies.wizard.huurtoeslag.steps.rent.description",
      fields: [
        { id: "rent", type: "currency", labelKey: "subsidies.wizard.huurtoeslag.fields.rent" },
        { id: "serviceCosts", type: "currency", labelKey: "subsidies.wizard.huurtoeslag.fields.serviceCosts" },
      ],
    },
  ],
  zorgtoeslag: [
    {
      key: "insurance",
      titleKey: "subsidies.wizard.zorgtoeslag.steps.insurance.title",
      descriptionKey: "subsidies.wizard.zorgtoeslag.steps.insurance.description",
      fields: [
        {
          id: "hasBasicInsurance",
          type: "toggle",
          labelKey: "subsidies.wizard.zorgtoeslag.fields.hasBasicInsurance",
          options: COMMON_YN_OPTIONS,
        },
        { id: "hasPartner", type: "toggle", labelKey: "subsidies.wizard.common.fields.hasPartner", options: COMMON_YN_OPTIONS },
      ],
    },
    {
      key: "income",
      titleKey: "subsidies.wizard.common.steps.income.title",
      descriptionKey: "subsidies.wizard.common.steps.income.description",
      fields: [
        { id: "incomeSelf", type: "currency", labelKey: "subsidies.wizard.common.fields.incomeSelf" },
        { id: "incomePartner", type: "currency", labelKey: "subsidies.wizard.common.fields.incomePartner" },
      ],
    },
  ],
  kgb: [
    {
      key: "family",
      titleKey: "subsidies.wizard.kgb.steps.family.title",
      descriptionKey: "subsidies.wizard.kgb.steps.family.description",
      fields: [
        { id: "childrenCount", type: "number", labelKey: "subsidies.wizard.kgb.fields.childrenCount" },
        { id: "hasPartner", type: "toggle", labelKey: "subsidies.wizard.common.fields.hasPartner", options: COMMON_YN_OPTIONS },
      ],
    },
    {
      key: "income",
      titleKey: "subsidies.wizard.common.steps.income.title",
      descriptionKey: "subsidies.wizard.common.steps.income.description",
      fields: [{ id: "incomeHousehold", type: "currency", labelKey: "subsidies.wizard.common.fields.incomeHousehold" }],
    },
  ],
  kot: [
    {
      key: "children",
      titleKey: "subsidies.wizard.kot.steps.children.title",
      descriptionKey: "subsidies.wizard.kot.steps.children.description",
      fields: [
        { id: "childrenCount", type: "number", labelKey: "subsidies.wizard.kot.fields.childrenCount" },
        {
          id: "childcareType",
          type: "select",
          labelKey: "subsidies.wizard.kot.fields.childcareType",
          options: [
            { value: "dagopvang", labelKey: "subsidies.wizard.kot.options.dagopvang" },
            { value: "bso", labelKey: "subsidies.wizard.kot.options.bso" },
            { value: "gastouder", labelKey: "subsidies.wizard.kot.options.gastouder" },
          ],
        },
      ],
    },
    {
      key: "costs",
      titleKey: "subsidies.wizard.kot.steps.costs.title",
      descriptionKey: "subsidies.wizard.kot.steps.costs.description",
      fields: [
        { id: "hoursPerMonth", type: "number", labelKey: "subsidies.wizard.kot.fields.hoursPerMonth" },
        { id: "costPerHour", type: "currency", labelKey: "subsidies.wizard.kot.fields.costPerHour" },
      ],
    },
    {
      key: "work",
      titleKey: "subsidies.wizard.kot.steps.work.title",
      descriptionKey: "subsidies.wizard.kot.steps.work.description",
      fields: [
        { id: "worksOrStudies", type: "toggle", labelKey: "subsidies.wizard.kot.fields.worksOrStudies", options: COMMON_YN_OPTIONS },
        { id: "partnerWorksOrStudies", type: "toggle", labelKey: "subsidies.wizard.kot.fields.partnerWorksOrStudies", options: COMMON_YN_OPTIONS },
      ],
    },
    {
      key: "income",
      titleKey: "subsidies.wizard.common.steps.income.title",
      descriptionKey: "subsidies.wizard.common.steps.income.description",
      fields: [{ id: "incomeHousehold", type: "currency", labelKey: "subsidies.wizard.common.fields.incomeHousehold" }],
    },
  ],
};
