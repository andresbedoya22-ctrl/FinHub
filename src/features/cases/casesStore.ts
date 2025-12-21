"use client";

import React, { useEffect } from "react";
import { create } from "zustand";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CaseType } from "@/features/cases/casesTypes";
import { defaultTitleForCaseType } from "@/features/cases/casesConfig";

type CaseRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  step_key: string;
  updated_at: string;
  [key: string]: unknown;
};


export type CaseItem = {
  id: string;
  title: string;
  type: CaseType | string;
  status: string;
  stepKey: string;
  updatedAt: string;
};

type CasesState = {
  cases: CaseItem[];
  isLoading: boolean;
  error: string | null;
};

type CasesActions = {
  loadCases: () => Promise<void>;
  createCase: (type: CaseType, title?: string) => Promise<string>;
  deleteCase: (id: string) => Promise<void>;

  // helpers usados por la UI
  getCase: (id: string) => CaseItem | undefined;
  setStatus: (id: string, status: string) => Promise<void>;
  setStepKey: (id: string, stepKey: string) => Promise<void>;

  // drafts locales (StepClient)
  getDraft: (caseId: string, stepKey: string) => unknown;
  setDraft: (caseId: string, stepKey: string, value: unknown) => void;
  clearDraft: (caseId: string, stepKey: string) => void;
};

type CasesStore = CasesActions & {
  // formato "nuevo"
  state: CasesState;

  // compatibilidad flat (por si algÃºn componente viejo lo usa)
  cases: CaseItem[];
  isLoading: boolean;
  error: string | null;
};

function initialStepKeyForType(type: string) {
  if (type.startsWith("toeslag_")) return "eligibility";
  if (type.startsWith("tax_")) return "intake";
  if (type.startsWith("finances_")) return "intake";
  return "start";
}

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

function draftKey(caseId: string, stepKey: string) {
  return `fh_case_draft:${caseId}:${stepKey}`;
}

export const useCases = create<CasesStore>((set, get) => ({
  state: { cases: [], isLoading: false, error: null },
  cases: [],
  isLoading: false,
  error: null,

  getCase: (id: string) => get().state.cases.find((c) => c.id === id),

  getDraft: (caseId: string, stepKey: string) => {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = window.localStorage.getItem(draftKey(caseId, stepKey));
      if (raw == null) return undefined;
      // si es JSON vÃ¡lido, lo devuelve parseado; si no, devuelve string
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch {
      return undefined;
    }
  },

  setDraft: (caseId: string, stepKey: string, value: unknown) => {
    if (typeof window === "undefined") return;
    try {
      const raw =
        typeof value === "string" ? value : JSON.stringify(value ?? null);
      window.localStorage.setItem(draftKey(caseId, stepKey), raw);
    } catch {
      // no-op
    }
  },

  clearDraft: (caseId: string, stepKey: string) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(draftKey(caseId, stepKey));
    } catch {
      // no-op
    }
  },

  loadCases: async () => {
    const supabase = createSupabaseBrowserClient();
    setAll(set, { isLoading: true, error: null });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      setAll(set, { isLoading: false, error: userErr.message });
      return;
    }
    if (!userData.user) {
      setAll(set, { cases: [], isLoading: false, error: null });
      return;
    }

    const { data, error } = await supabase
      .from("cases")
      .select("id,title,type,status,step_key,updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      setAll(set, { isLoading: false, error: error.message });
      return;
    }

    const cases: CaseItem[] = (data ?? []).map((r: CaseRow) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      status: r.status,
      stepKey: r.step_key,
      updatedAt: r.updated_at,
    }));

    setAll(set, { cases, isLoading: false, error: null });
  },

  createCase: async (type: CaseType, title?: string) => {
    const supabase = createSupabaseBrowserClient();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw new Error(userErr.message);
    if (!userData.user) throw new Error("No authenticated user");

    const finalTitle =
      title && title.trim().length > 0
        ? title.trim()
        : defaultTitleForCaseType(type);

    const stepKey = initialStepKeyForType(type);

    const { data, error } = await supabase
      .from("cases")
      .insert({
        user_id: userData.user.id,
        title: finalTitle,
        status: "open",
        type,
        step_key: stepKey,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await get().loadCases();
    return data.id as string;
  },

  deleteCase: async (id: string) => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("cases").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await get().loadCases();
  },

  setStatus: async (id: string, status: string) => {
    const supabase = createSupabaseBrowserClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw new Error(userErr.message);
    if (!userData.user) throw new Error("No authenticated user");

    const { error } = await supabase
      .from("cases")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error(error.message);
    await get().loadCases();
  },

  setStepKey: async (id: string, stepKey: string) => {
    const supabase = createSupabaseBrowserClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw new Error(userErr.message);
    if (!userData.user) throw new Error("No authenticated user");

    const { error } = await supabase
      .from("cases")
      .update({ step_key: stepKey, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error(error.message);
    await get().loadCases();
  },
}));

export function CasesProvider({ children }: { children: React.ReactNode }) {
  const loadCases = useCases((s) => s.loadCases);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  // sin JSX para que .ts compile
  return React.createElement(React.Fragment, null, children);
}
