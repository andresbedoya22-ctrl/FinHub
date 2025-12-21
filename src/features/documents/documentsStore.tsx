"use client";

import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { DocumentEntity, DocumentStatus, DocumentType, DocumentsState } from "./documentsTypes";
import { loadDocumentsState, saveDocumentsState } from "./documentsStorage";

type Action =
  | { type: "INIT"; payload: DocumentsState }
  | { type: "ADD"; payload: { fileName: string; type: DocumentType; caseId?: string; notes?: string } }
  | { type: "DELETE"; payload: { id: string } }
  | { type: "SET_STATUS"; payload: { id: string; status: DocumentStatus } }
  | { type: "SET_CASE"; payload: { id: string; caseId?: string } }
  | { type: "SET_NOTES"; payload: { id: string; notes: string } };

const initialState: DocumentsState = { documents: [] };

function nowISO() {
  return new Date().toISOString();
}

function genId() {
  return `d_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function reducer(state: DocumentsState, action: Action): DocumentsState {
  switch (action.type) {
    case "INIT":
      return action.payload;

    case "ADD": {
      const id = genId();
      const created: DocumentEntity = {
        id,
        fileName: action.payload.fileName.trim(),
        type: action.payload.type,
        status: "pending",
        caseId: action.payload.caseId,
        notes: action.payload.notes?.trim() || "",
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      return { ...state, documents: [created, ...state.documents] };
    }

    case "DELETE":
      return { ...state, documents: state.documents.filter((d) => d.id !== action.payload.id) };

    case "SET_STATUS":
      return {
        ...state,
        documents: state.documents.map((d) =>
          d.id === action.payload.id ? { ...d, status: action.payload.status, updatedAt: nowISO() } : d
        ),
      };

    case "SET_CASE":
      return {
        ...state,
        documents: state.documents.map((d) =>
          d.id === action.payload.id ? { ...d, caseId: action.payload.caseId, updatedAt: nowISO() } : d
        ),
      };

    case "SET_NOTES":
      return {
        ...state,
        documents: state.documents.map((d) =>
          d.id === action.payload.id ? { ...d, notes: action.payload.notes, updatedAt: nowISO() } : d
        ),
      };

    default:
      return state;
  }
}

type DocumentsContextValue = {
  state: DocumentsState;
  addDocument: (args: { fileName: string; type: DocumentType; caseId?: string; notes?: string }) => void;
  deleteDocument: (id: string) => void;
  setStatus: (id: string, status: DocumentStatus) => void;
  setCase: (id: string, caseId?: string) => void;
  setNotes: (id: string, notes: string) => void;
};

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const loaded = loadDocumentsState();
    if (loaded) dispatch({ type: "INIT", payload: loaded });
  }, []);

  useEffect(() => {
    saveDocumentsState(state);
  }, [state]);

  const api = useMemo<DocumentsContextValue>(() => {
    return {
      state,
      addDocument: (args) => dispatch({ type: "ADD", payload: args }),
      deleteDocument: (id) => dispatch({ type: "DELETE", payload: { id } }),
      setStatus: (id, status) => dispatch({ type: "SET_STATUS", payload: { id, status } }),
      setCase: (id, caseId) => dispatch({ type: "SET_CASE", payload: { id, caseId } }),
      setNotes: (id, notes) => dispatch({ type: "SET_NOTES", payload: { id, notes } }),
    };
  }, [state]);

  return <DocumentsContext.Provider value={api}>{children}</DocumentsContext.Provider>;
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error("useDocuments must be used within DocumentsProvider");
  return ctx;
}
