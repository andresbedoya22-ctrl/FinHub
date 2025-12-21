"use client";

import { create } from "zustand";

type DraftValue = string | Record<string, unknown> | null;

type CaseDraftsStore = {
  getDraft: (caseId: string, stepKey: string) => DraftValue;
  setDraft: (caseId: string, stepKey: string, value: DraftValue) => void;
  clearDraft: (caseId: string, stepKey: string) => void;
};

const LS_PREFIX = "fh_case_step_draft:";

function lsKey(caseId: string, stepKey: string) {
  return `${LS_PREFIX}${caseId}:${stepKey}`;
}

function safeParse(raw: string): DraftValue {
  try {
    return JSON.parse(raw) as DraftValue;
  } catch {
    return raw; // si era texto plano
  }
}

export const useCaseDrafts = create<CaseDraftsStore>(() => ({
  getDraft: (caseId, stepKey) => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(lsKey(caseId, stepKey));
    if (!raw) return null;
    return safeParse(raw);
  },

  setDraft: (caseId, stepKey, value) => {
    if (typeof window === "undefined") return;
    if (value === null) {
      window.localStorage.removeItem(lsKey(caseId, stepKey));
      return;
    }
    const raw = typeof value === "string" ? value : JSON.stringify(value);
    window.localStorage.setItem(lsKey(caseId, stepKey), raw);
  },

  clearDraft: (caseId, stepKey) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(lsKey(caseId, stepKey));
  },
}));
