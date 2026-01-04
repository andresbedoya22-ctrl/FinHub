import type { FinanceTxStatus, IsoMonth } from "./financesTypes";

export interface FinancesFilters {
  month: IsoMonth;
  status: FinanceTxStatus | "all";
  query: string;
  categoryId: string | "all";
}

export interface FinancesSelection {
  focusedId: string | null;
  selectedIds: string[];
}

export interface FinancesUiState {
  filters: FinancesFilters;
  selection: FinancesSelection;
  forecastMode: boolean;
}

export type FinancesAction =
  | { type: "setMonth"; month: IsoMonth }
  | { type: "setStatus"; status: FinanceTxStatus | "all" }
  | { type: "setQuery"; query: string }
  | { type: "setCategory"; categoryId: string | "all" }
  | { type: "setFocused"; id: string | null }
  | { type: "toggleSelect"; id: string }
  | { type: "selectOnly"; id: string }
  | { type: "clearSelection" }
  | { type: "setForecastMode"; enabled: boolean };

export function createInitialFinancesState(month: IsoMonth): FinancesUiState {
  return {
    filters: { month, status: "all", query: "", categoryId: "all" },
    selection: { focusedId: null, selectedIds: [] },
    forecastMode: false,
  };
}

function toggleInArray(arr: string[], id: string): string[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}

export function financesReducer(state: FinancesUiState, action: FinancesAction): FinancesUiState {
  switch (action.type) {
    case "setMonth":
      return { ...state, filters: { ...state.filters, month: action.month }, selection: { focusedId: null, selectedIds: [] } };
    case "setStatus":
      return { ...state, filters: { ...state.filters, status: action.status } };
    case "setQuery":
      return { ...state, filters: { ...state.filters, query: action.query } };
    case "setCategory":
      return { ...state, filters: { ...state.filters, categoryId: action.categoryId } };
    case "setFocused":
      return { ...state, selection: { ...state.selection, focusedId: action.id } };
    case "toggleSelect":
      return { ...state, selection: { ...state.selection, focusedId: action.id, selectedIds: toggleInArray(state.selection.selectedIds, action.id) } };
    case "selectOnly":
      return { ...state, selection: { focusedId: action.id, selectedIds: action.id ? [action.id] : [] } };
    case "clearSelection":
      return { ...state, selection: { focusedId: null, selectedIds: [] } };
    case "setForecastMode":
      return { ...state, forecastMode: action.enabled };
    default:
      return state;
  }
}