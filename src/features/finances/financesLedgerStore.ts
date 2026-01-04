"use client";

import { create } from "zustand";

import type { FinanceCategory, FinanceTransaction, FinanceTransactionSplit } from "./financesTypes";
import { fetchLedger, patchTransaction, type PatchTransaction } from "./financesLedgerApi";

type State = {
  month: string | null;
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  splitsByTxId: Record<string, FinanceTransactionSplit[]>;
  loading: boolean;
  error: string | null;

  load: (month?: string) => Promise<void>;
  patchTx: (id: string, patch: PatchTransaction) => Promise<void>;
  bulkPatch: (ids: string[], patch: PatchTransaction) => Promise<void>;
};

export const useFinancesLedger = create<State>((set, get) => ({
  month: null,
  categories: [],
  transactions: [],
  splitsByTxId: {},
  loading: false,
  error: null,

  load: async (month?: string) => {
    set({ loading: true, error: null });
    try {
      const data = await fetchLedger(month);
      set({
        month: data.month,
        categories: data.categories,
        transactions: data.transactions,
        splitsByTxId: data.splitsByTxId ?? {},
        loading: false,
        error: null,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error cargando ledger";
      set({ loading: false, error: msg });
    }
  },

  patchTx: async (id: string, patch: PatchTransaction) => {
    const { transactions } = get();
    const prev = transactions;
    const next = transactions.map((t) => (t.id === id ? { ...t, ...patch } : t));
    set({ transactions: next });

    try {
      const updated = await patchTransaction(id, patch);
      set({ transactions: get().transactions.map((t) => (t.id === id ? updated : t)) });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error persistiendo transacción";
      set({ transactions: prev, error: msg });
    }
  },

  bulkPatch: async (ids: string[], patch: PatchTransaction) => {
    await Promise.all(ids.map((id) => get().patchTx(id, patch)));
  },
}));