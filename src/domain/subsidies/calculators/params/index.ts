import type { CalculationYear } from "../types";
import { PARAMS_2026 } from "./2026";

export function getCalculationParams(year: CalculationYear) {
  switch (year) {
    case 2026:
      return PARAMS_2026;
    default:
      return PARAMS_2026;
  }
}
