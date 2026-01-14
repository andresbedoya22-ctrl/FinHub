"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SubsidySlug, EligibilityResult } from "./types";

export type SubsidyWizardAnswers = Record<string, string | number | boolean | null>;

type WizardState = {
  answersBySlug: Record<SubsidySlug, SubsidyWizardAnswers>;
  resultBySlug: Record<SubsidySlug, EligibilityResult | null>;
  setAnswer: (slug: SubsidySlug, fieldId: string, value: SubsidyWizardAnswers[string]) => void;
  setResult: (slug: SubsidySlug, result: EligibilityResult | null) => void;
  reset: (slug: SubsidySlug) => void;
};

const EMPTY: Record<SubsidySlug, SubsidyWizardAnswers> = {
  huurtoeslag: {},
  zorgtoeslag: {},
  kgb: {},
  kot: {},
};

const EMPTY_RESULTS: Record<SubsidySlug, EligibilityResult | null> = {
  huurtoeslag: null,
  zorgtoeslag: null,
  kgb: null,
  kot: null,
};

export const useSubsidyWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      answersBySlug: EMPTY,
      resultBySlug: EMPTY_RESULTS,
      setAnswer: (slug, fieldId, value) =>
        set((state) => ({
          answersBySlug: {
            ...state.answersBySlug,
            [slug]: { ...state.answersBySlug[slug], [fieldId]: value },
          },
        })),
      setResult: (slug, result) =>
        set((state) => ({
          resultBySlug: { ...state.resultBySlug, [slug]: result },
        })),
      reset: (slug) =>
        set((state) => ({
          answersBySlug: { ...state.answersBySlug, [slug]: {} },
          resultBySlug: { ...state.resultBySlug, [slug]: null },
        })),
    }),
    { name: "finhub.subsidies.wizard.v1" }
  )
);
