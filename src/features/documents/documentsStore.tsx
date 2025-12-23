"use client";

import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { DocumentEntity, DocumentStatus, DocumentType, DocumentsState } from "./documentsTypes";
import { createDocument, deleteDocumentById, listMyDocuments, updateDocument } from "./documentsClient";

type Action =
  | { type: "INIT"; payload: DocumentsState }
  | { type: "ADD"; payload: DocumentEntity }
  | { type: "DELETE"; payload: { id: string } }
  | { type: "SET_STATUS"; payload: { id: string; status: DocumentStatus } }
  | { type: "SET_CASE"; payload: { id: string; caseId?: string } }
  | { type: "SET_NOTES"; payload: { id: string; notes: string } };

const initialState: DocumentsState = { documents: [] };

function reducer(state: DocumentsState, action: Action): DocumentsState {
  switch (action.type) {
    case "INIT":
      return action.payload;

    case "ADD":
      return { ...state, documents: [action.payload, ...state.documents] };

    case "DELETE":
      return { ...state, documents: state.documents.filter((d) => d.id !== action.payload.id) };

    case "SET_STATUS":
      return {
        ...state,
        documents: state.documents.map((d) =>
          d.id === action.payload.id ? { ...d, status: action.payload.status, updatedAt: new Date().toISOString() } : d
        ),
      };

    case "SET_CASE":
      return {
        ...state,
        documents: state.documents.map((d) =>
          d.id === action.payload.id ? { ...d, caseId: action.payload.caseId, updatedAt: new Date().toISOString() } : d
        ),
      };

    case "SET_NOTES":
      return {
        ...state,
        documents: state.documents.map((d) =>
          d.id === action.payload.id ? { ...d, notes: action.payload.notes, updatedAt: new Date().toISOString() } : d
        ),
      };

    default:
      return state;
  }
}

type DocumentsContextValue = {
  state: DocumentsState;
  addDocument: (args: { fileName: string; type: DocumentType; caseId?: string; notes?: string }) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  setStatus: (id: string, status: DocumentStatus) => Promise<void>;
  setCase: (id: string, caseId?: string) => Promise<void>;
  setNotes: (id: string, notes: string) => Promise<void>;
};

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const docs = await listMyDocuments();
        if (!alive) return;
        dispatch({ type: "INIT", payload: { documents: docs } });
      } catch {
        if (!alive) return;
        dispatch({ type: "INIT", payload: { documents: [] } });
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const api = useMemo<DocumentsContextValue>(() => {
    return {
      state,

      addDocument: async (args) => {
        const created = await createDocument(args);
        dispatch({ type: "ADD", payload: created });
      },

      deleteDocument: async (id) => {
        await deleteDocumentById(id);
        dispatch({ type: "DELETE", payload: { id } });
      },

      setStatus: async (id, status) => {
        await updateDocument(id, { status });
        dispatch({ type: "SET_STATUS", payload: { id, status } });
      },

      setCase: async (id, caseId) => {
        await updateDocument(id, { caseId: caseId ?? null });
        dispatch({ type: "SET_CASE", payload: { id, caseId } });
      },

      setNotes: async (id, notes) => {
        await updateDocument(id, { notes });
        dispatch({ type: "SET_NOTES", payload: { id, notes } });
      },
    };
  }, [state]);

  return <DocumentsContext.Provider value={api}>{children}</DocumentsContext.Provider>;
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error("useDocuments must be used within DocumentsProvider");
  return ctx;
}
