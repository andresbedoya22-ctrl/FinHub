import type { CasesState } from "./casesTypes";

const STORAGE_KEY = "fh_cases_state_v1";

export function loadCasesState(): CasesState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CasesState;
  } catch {
    return null;
  }
}

export function saveCasesState(state: CasesState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silencioso: si el storage falla, seguimos sin persistencia.
  }
}
