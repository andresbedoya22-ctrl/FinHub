"use client";

import type { ReactNode } from "react";
import { CasesProvider } from "@/features/cases/casesStore";
import { DocumentsProvider } from "@/features/documents/documentsStore";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <CasesProvider>
      <DocumentsProvider>{children}</DocumentsProvider>
    </CasesProvider>
  );
}
