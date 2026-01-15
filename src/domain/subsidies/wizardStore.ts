"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SubsidySlug, EligibilityResult } from "./types";

export type SubsidyWizardAnswers = Record<string, string | number | boolean | null>;

type WizardState = {
  answersBySlug: Record<SubsidySlug, SubsidyWizardAnswers>;
  resultBySlug: Record<SubsidySlug, EligibilityResult | null>;
  stepIndexBySlug: Record<SubsidySlug, number>;
  setAnswer: (slug: SubsidySlug, fieldId: string, value: SubsidyWizardAnswers[string]) => void;
  setResult: (slug: SubsidySlug, result: EligibilityResult | null) => void;
  setStepIndex: (slug: SubsidySlug, index: number) => void;
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

const EMPTY_STEPS: Record<SubsidySlug, number> = {
  huurtoeslag: 0,
  zorgtoeslag: 0,
  kgb: 0,
  kot: 0,
};

export const useSubsidyWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      answersBySlug: EMPTY,
      resultBySlug: EMPTY_RESULTS,
      stepIndexBySlug: EMPTY_STEPS,
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
      setStepIndex: (slug, index) =>
        set((state) => ({
          stepIndexBySlug: { ...state.stepIndexBySlug, [slug]: index },
        })),
      reset: (slug) =>
        set((state) => ({
          answersBySlug: { ...state.answersBySlug, [slug]: {} },
          resultBySlug: { ...state.resultBySlug, [slug]: null },
          stepIndexBySlug: { ...state.stepIndexBySlug, [slug]: 0 },
        })),
    }),
    { name: "finhub.subsidies.wizard.v1" }
  )
);
