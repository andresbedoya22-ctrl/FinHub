import type {
  ApiResponse,
  FinanceCategory,
  FinanceListParams,
  FinanceMonthlySnapshot,
  FinanceReceiptLink,
  FinanceTransaction,
  FinanceTransactionSplit,
  IsoMonth,
} from "./financesTypes";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as ApiResponse<T>) : ({ ok: false, error: { message: "Empty response" } } as ApiResponse<T>);

  if (!res.ok || !json.ok || !json.data) {
    const msg = json?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return json.data;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const financesClient = {
  // Categories
  async listCategories(): Promise<FinanceCategory[]> {
    return apiFetch<FinanceCategory[]>("/api/finances/categories");
  },

  async upsertCategory(input: Partial<FinanceCategory> & { key: string; label: string }): Promise<FinanceCategory> {
    return apiFetch<FinanceCategory>("/api/finances/categories", {
      method: "POST",
      body: JSON.stringify({ input }),
    });
  },

  async deleteCategory(id: string): Promise<{ id: string }> {
    return apiFetch<{ id: string }>(`/api/finances/categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // Transactions
  async listTransactions(params: FinanceListParams): Promise<FinanceTransaction[]> {
    const q = qs({
      month: params.month,
      status: params.status ?? "all",
      categoryId: params.categoryId ?? "all",
      query: params.query ?? "",
      limit: params.limit?.toString(),
      offset: params.offset?.toString(),
    });
    return apiFetch<FinanceTransaction[]>(`/api/finances/transactions${q}`);
  },

  async createTransaction(input: Omit<FinanceTransaction, "id" | "userId" | "createdAt" | "updatedAt">): Promise<FinanceTransaction> {
    return apiFetch<FinanceTransaction>("/api/finances/transactions", {
      method: "POST",
      body: JSON.stringify({ input }),
    });
  },

  async patchTransaction(id: string, patch: Partial<FinanceTransaction>): Promise<FinanceTransaction> {
    return apiFetch<FinanceTransaction>(`/api/finances/transactions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ patch }),
    });
  },

  async bulkPatchTransactions(ids: string[], patch: Partial<FinanceTransaction>): Promise<{ updated: number }> {
    return apiFetch<{ updated: number }>("/api/finances/transactions/bulk", {
      method: "POST",
      body: JSON.stringify({ ids, patch }),
    });
  },

  // Splits
  async setSplits(transactionId: string, splits: Array<Omit<FinanceTransactionSplit, "id" | "userId" | "createdAt" | "updatedAt">>): Promise<FinanceTransactionSplit[]> {
    return apiFetch<FinanceTransactionSplit[]>(`/api/finances/transactions/${encodeURIComponent(transactionId)}/splits`, {
      method: "PUT",
      body: JSON.stringify({ splits }),
    });
  },

  // Receipt links (OCR -> tx)
  async linkReceipt(input: Omit<FinanceReceiptLink, "id" | "userId" | "createdAt">): Promise<FinanceReceiptLink> {
    return apiFetch<FinanceReceiptLink>("/api/finances/receipts/link", {
      method: "POST",
      body: JSON.stringify({ input }),
    });
  },

  // Snapshots
  async getSnapshot(month: IsoMonth): Promise<FinanceMonthlySnapshot | null> {
    const q = qs({ month });
    return apiFetch<FinanceMonthlySnapshot | null>(`/api/finances/snapshots${q}`);
  },

  async upsertSnapshot(input: Omit<FinanceMonthlySnapshot, "id" | "userId" | "createdAt" | "updatedAt">): Promise<FinanceMonthlySnapshot> {
    return apiFetch<FinanceMonthlySnapshot>("/api/finances/snapshots", {
      method: "POST",
      body: JSON.stringify({ input }),
    });
  },

  // CSV export (server-side in F11.5)
  async exportCsv(month: IsoMonth): Promise<{ filename: string; csv: string }> {
    const q = qs({ month });
    return apiFetch<{ filename: string; csv: string }>(`/api/finances/export${q}`);
  },
};