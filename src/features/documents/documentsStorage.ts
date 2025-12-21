import type { DocumentsState } from "./documentsTypes";

const STORAGE_KEY = "fh_documents_state_v1";

export function loadDocumentsState(): DocumentsState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DocumentsState;
  } catch {
    return null;
  }
}

export function saveDocumentsState(state: DocumentsState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silencioso
  }
}
