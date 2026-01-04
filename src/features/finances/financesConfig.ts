import type { FinanceCategory } from "./financesTypes";

export type FinanceCategorySeed = Omit<
  FinanceCategory,
  "id" | "userId" | "createdAt" | "updatedAt"
>;

export const FINANCE_CATEGORY_KEYS = {
  housing: "housing",
  utilities: "utilities",
  groceries: "groceries",
  transport: "transport",
  health: "health",
  insurance: "insurance",
  taxes: "taxes",
  leisure: "leisure",
  subscriptions: "subscriptions",
  household: "household",
  education: "education",
  other: "other",
} as const;

export const DEFAULT_CATEGORIES: FinanceCategorySeed[] = [
  { key: FINANCE_CATEGORY_KEYS.housing,       label: "Vivienda",               sortOrder: 10, isSystem: true },
  { key: FINANCE_CATEGORY_KEYS.utilities,     label: "Servicios",              sortOrder: 20, isSystem: true },
  { key: FINANCE_CATEGORY_KEYS.groceries,     label: "Alimentación",           sortOrder: 30, isSystem: true },
  { key: FINANCE_CATEGORY_KEYS.transport,     label: "Transporte",             sortOrder: 40, isSystem: true },
  { key: FINANCE_CATEGORY_KEYS.health,        label: "Salud",                  sortOrder: 50, isSystem: true },
  { key: FINANCE_CATEGORY_KEYS.insurance,     label: "Seguros",                sortOrder: 60, isSystem: true },
  { key: FINANCE_CATEGORY_KEYS.taxes,         label: "Impuestos / Gobierno",   sortOrder: 70, isSystem: true },
  { key: FINANCE_CATEGORY_KEYS.leisure,       label: "Ocio",                   sortOrder: 80, isSystem: true },
  { key: FINANCE_CATEGORY_KEYS.subscriptions, label: "Suscripciones / Software", sortOrder: 90, isSystem: true },
  { key: FINANCE_CATEGORY_KEYS.household,     label: "Compras / Hogar",        sortOrder: 100, isSystem: true },
  { key: FINANCE_CATEGORY_KEYS.education,     label: "Educación",              sortOrder: 110, isSystem: true },
  { key: FINANCE_CATEGORY_KEYS.other,         label: "Otros",                  sortOrder: 999, isSystem: true },
];

export const FALLBACK_CATEGORY_KEY = FINANCE_CATEGORY_KEYS.other;

export function sortCategories(a: FinanceCategory, b: FinanceCategory): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.label.localeCompare(b.label, "es");
}

export function buildCategoryMaps(categories: FinanceCategory[]): {
  byId: Record<string, FinanceCategory>;
  byKey: Record<string, FinanceCategory>;
} {
  const byId: Record<string, FinanceCategory> = {};
  const byKey: Record<string, FinanceCategory> = {};
  for (const c of categories) {
    byId[c.id] = c;
    byKey[c.key] = c;
  }
  return { byId, byKey };
}