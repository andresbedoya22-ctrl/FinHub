"use client";

import React, { useEffect } from "react";
import { create } from "zustand";
import type { CaseEntity, CaseStatus, CaseStepKey, CaseType } from "./casesTypes";
import { createCase as apiCreateCase, listCases, updateCase as apiUpdateCase } from "./casesApi";
import { defaultTitleForCaseType } from "./casesConfig";

type CasesState = {
  cases: CaseEntity[];
  isLoading: boolean;
  error: string | null;
};

type CasesActions = {
  loadCases: () => Promise<void>;
  createCase: (type: CaseType, title?: string, productSlug?: string) => Promise<string>;
  setStatus: (id: string, status: CaseStatus) => Promise<void>;
  setStepKey: (id: string, stepKey: CaseStepKey) => Promise<void>;
  getCase: (id: string) => CaseEntity | undefined;
};

type CasesStore = CasesActions & {
  state: CasesState;
  cases: CaseEntity[];
  isLoading: boolean;
  error: string | null;
};

function setAll(
  set: (fn: (prev: CasesStore) => Partial<CasesStore>) => void,
  patch: Partial<CasesState>
) {
  set((prev) => {
    const nextState: CasesState = {
      cases: patch.cases ?? prev.state.cases,
      isLoading: patch.isLoading ?? prev.state.isLoading,
      error: patch.error ?? prev.state.error,
    };

    return {
      state: nextState,
      cases: nextState.cases,
      isLoading: nextState.isLoading,
      error: nextState.error,
    };
  });
}

export const useCases = create<CasesStore>((set, get) => ({
  state: { cases: [], isLoading: false, error: null },
  cases: [],
  isLoading: false,
  error: null,

  getCase: (id: string) => get().state.cases.find((c) => c.id === id),

  loadCases: async () => {
    setAll(set, { isLoading: true, error: null });
    try {
      const cases = await listCases();
      setAll(set, { cases, isLoading: false, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load cases";
      setAll(set, { isLoading: false, error: msg });
    }
  },

  createCase: async (type: CaseType, title?: string, productSlug?: string) => {
    const finalTitle = title && title.trim().length > 0 ? title.trim() : defaultTitleForCaseType(type);
    const created = await apiCreateCase({
      type,
      title: finalTitle,
      productSlug: productSlug?.trim() ? productSlug.trim() : null,
    });
    await get().loadCases();
    return created.id;
  },

  setStatus: async (id: string, status: CaseStatus) => {
    await apiUpdateCase(id, { status });
    await get().loadCases();
  },

  setStepKey: async (id: string, stepKey: CaseStepKey) => {
    await apiUpdateCase(id, { stepKey });
    await get().loadCases();
  },
}));

export function CasesProvider({ children }: { children: React.ReactNode }) {
  const loadCases = useCases((s) => s.loadCases);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  return React.createElement(React.Fragment, null, children);
}
