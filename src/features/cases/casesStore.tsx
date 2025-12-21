"use client";

import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { CaseEntity, CaseType, CasesState, StepKey } from "./casesTypes";
import { defaultTitleForCaseType, stepsForCaseType } from "./casesConfig";
import { loadCasesState, saveCasesState } from "./casesStorage";

type Action =
  | { type: "INIT"; payload: CasesState }
  | { type: "CREATE_CASE"; payload: { type: CaseType; title?: string } }
  | { type: "DELETE_CASE"; payload: { caseId: string } }
  | { type: "SET_STEP"; payload: { caseId: string; stepKey: StepKey } }
  | { type: "SET_STATUS"; payload: { caseId: string; status: CaseEntity["status"] } }
  | { type: "SAVE_DRAFT"; payload: { caseId: string; stepKey: StepKey; data: unknown } };

const initialState: CasesState = {
  cases: [],
  draftsByCaseId: {},
};

function nowISO() {
  return new Date().toISOString();
}

function genId() {
  // Simple y suficiente para v1 local.
  return `c_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function reducer(state: CasesState, action: Action): CasesState {
  switch (action.type) {
    case "INIT":
      return action.payload;

    case "CREATE_CASE": {
      const id = genId();
      const steps = stepsForCaseType(action.payload.type);
      const firstStep = steps[0]?.key ?? "intake";
      const title = (action.payload.title?.trim() || defaultTitleForCaseType(action.payload.type)).trim();

      const created: CaseEntity = {
        id,
        type: action.payload.type,
        title,
        status: "created",
        stepKey: firstStep,
        steps,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };

      return {
        ...state,
        cases: [created, ...state.cases],
        draftsByCaseId: {
          ...state.draftsByCaseId,
          [id]: state.draftsByCaseId[id] ?? {},
        },
      };
    }

    case "DELETE_CASE": {
      const { caseId } = action.payload;
      const nextCases = state.cases.filter((c) => c.id !== caseId);
      const nextDrafts = { ...state.draftsByCaseId };
      delete nextDrafts[caseId];
      return { ...state, cases: nextCases, draftsByCaseId: nextDrafts };
    }

    case "SET_STEP": {
      const { caseId, stepKey } = action.payload;
      return {
        ...state,
        cases: state.cases.map((c) =>
          c.id === caseId ? { ...c, stepKey, status: c.status === "created" ? "in_progress" : c.status, updatedAt: nowISO() } : c
        ),
      };
    }

    case "SET_STATUS": {
      const { caseId, status } = action.payload;
      return {
        ...state,
        cases: state.cases.map((c) => (c.id === caseId ? { ...c, status, updatedAt: nowISO() } : c)),
      };
    }

    case "SAVE_DRAFT": {
      const { caseId, stepKey, data } = action.payload;
      const prev = state.draftsByCaseId[caseId] ?? {};
      return {
        ...state,
        draftsByCaseId: {
          ...state.draftsByCaseId,
          [caseId]: {
            ...prev,
            [stepKey]: data,
          },
        },
      };
    }

    default:
      return state;
  }
}

type CasesContextValue = {
  state: CasesState;
  createCase: (type: CaseType, title?: string) => string; // retorna id
  deleteCase: (caseId: string) => void;
  setStep: (caseId: string, stepKey: StepKey) => void;
  setStatus: (caseId: string, status: CaseEntity["status"]) => void;
  saveDraft: (caseId: string, stepKey: StepKey, data: unknown) => void;
  getCase: (caseId: string) => CaseEntity | undefined;
  getDraft: (caseId: string, stepKey: StepKey) => unknown;
};

const CasesContext = createContext<CasesContextValue | null>(null);

export function CasesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // INIT desde localStorage
  useEffect(() => {
    const loaded = loadCasesState();
    if (loaded) dispatch({ type: "INIT", payload: loaded });
  }, []);

  // Persistencia
  useEffect(() => {
    saveCasesState(state);
  }, [state]);

  const api = useMemo<CasesContextValue>(() => {
    return {
      state,
      createCase: (type, title) => {
        const id = genId();
        const steps = stepsForCaseType(type);
        const firstStep = steps[0]?.key ?? "intake";
        const finalTitle = (title?.trim() || defaultTitleForCaseType(type)).trim();

        const created: CaseEntity = {
          id,
          type,
          title: finalTitle,
          status: "created",
          stepKey: firstStep,
          steps,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };

        // Reducer no puede generar el id fuera si no lo pasamos; por eso hacemos INIT-like local:
        // En vez de duplicar lógica, despachamos CREATE_CASE y luego buscamos, pero eso no devuelve id fácil.
        // Solución: emular acción creando case manualmente:
        dispatch({ type: "INIT", payload: { cases: [created, ...state.cases], draftsByCaseId: { ...state.draftsByCaseId, [id]: state.draftsByCaseId[id] ?? {} } } });
        return id;
      },
      deleteCase: (caseId) => dispatch({ type: "DELETE_CASE", payload: { caseId } }),
      setStep: (caseId, stepKey) => dispatch({ type: "SET_STEP", payload: { caseId, stepKey } }),
      setStatus: (caseId, status) => dispatch({ type: "SET_STATUS", payload: { caseId, status } }),
      saveDraft: (caseId, stepKey, data) => dispatch({ type: "SAVE_DRAFT", payload: { caseId, stepKey, data } }),
      getCase: (caseId) => state.cases.find((c) => c.id === caseId),
      getDraft: (caseId, stepKey) => state.draftsByCaseId[caseId]?.[stepKey],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return <CasesContext.Provider value={api}>{children}</CasesContext.Provider>;
}

export function useCases() {
  const ctx = useContext(CasesContext);
  if (!ctx) throw new Error("useCases must be used within CasesProvider");
  return ctx;
}
