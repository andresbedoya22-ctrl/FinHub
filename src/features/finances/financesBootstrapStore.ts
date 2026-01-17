import { create } from "zustand";

import type { FinanceRulesV1, FinanceUserPlan, FinancesBootstrap } from "./financesTypes";
import { getFinancesBootstrap, saveFinancesBootstrap } from "./financesBootstrapApi";

type State = {
  loading: boolean;
  error: string | null;

  plan: FinanceUserPlan | null;
  rules: FinanceRulesV1 | null;

  load: () => Promise<void>;
  save: (next: FinancesBootstrap) => Promise<void>;
};

export const useFinancesBootstrap = create<State>((set) => ({
  loading: false,
  error: null,
  plan: null,
  rules: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const dto = await getFinancesBootstrap();
      set({ plan: dto.plan, rules: dto.rules, loading: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      set({ error: msg, loading: false });
    }
  },

  save: async (next) => {
    set({ loading: true, error: null });
    try {
      await saveFinancesBootstrap(next);
      const dto = await getFinancesBootstrap();
      set({ plan: dto.plan, rules: dto.rules, loading: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      set({ error: msg, loading: false });
    }
  },
}));
