export type FinanceTxStatus = "pending" | "approved" | "hidden";
export type FinanceTxSource = "manual" | "ocr";

export type CurrencyCode = "EUR";

export type IsoDate = string;     // YYYY-MM-DD
export type IsoMonth = string;    // YYYY-MM

export interface FinanceCategory {
  id: string;
  userId?: string;
  key: string;           // stable key (e.g. "housing")
  label: string;         // user-visible label (editable)
  sortOrder: number;
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceTransaction {
  id: string;
  userId?: string;

  occurredOn: IsoDate;
  merchantName: string;
  merchantNorm: string;

  categoryId: string | null;

  // Signed cents: expenses negative, income positive
  amountCents: number;
  currency: CurrencyCode;

  status: FinanceTxStatus;
  source: FinanceTxSource;

  note?: string | null;
  reviewedAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceTransactionSplit {
  id: string;
  userId?: string;
  transactionId: string;

  categoryId: string | null;
  splitAmountCents: number; // signed cents
  note?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceReceiptLink {
  id: string;
  userId?: string;
  documentId: string;
  transactionId: string;
  createdAt?: string;
}

export interface FinanceBreakdown {
  byCategoryCents?: Record<string, number>; // categoryKey -> signed cents (expenses negative)
  topMerchants?: Array<{
    merchantNorm: string;
    merchantName: string;
    totalCents: number; // signed
    count: number;
  }>;
  daily?: Array<{
    day: IsoDate;
    spentOutflowCents: number; // positive outflow for the day
    incomeInflowCents: number; // positive inflow for the day
  }>;
}

export interface FinanceMonthlySnapshot {
  id: string;
  userId?: string;

  month: IsoMonth;

  incomeCents: number;          // positive
  expenseOutflowCents: number;  // positive
  netCents: number;             // income - outflow
  safeToSpendCents: number;     // net - remainingFixedBudget

  breakdown: FinanceBreakdown;

  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceFixedBudget {
  id: string;
  label: string;
  monthlyCents: number; // positive
  isActive: boolean;
}

export interface FinanceUserPlan {
  projectedIncomeMonthlyCents: number; // positive; user-defined
  fixedBudgets: FinanceFixedBudget[];  // user-defined list
}

export type FinanceRulesV1 = {
  version: 1;
  safeToSpendMode: "income-expense-fixedRemaining";
};

export type FinancesBootstrap = {
  plan: FinanceUserPlan;
  rules: FinanceRulesV1;
};

export interface FinanceListParams {
  month: IsoMonth; // fixed month scope for v1
  status?: FinanceTxStatus | "all";
  categoryId?: string | "all";
  query?: string;
  limit?: number;
  offset?: number;
}

export interface ApiErrorShape {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: ApiErrorShape;
}
