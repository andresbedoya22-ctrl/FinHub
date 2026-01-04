import type { FinanceCategory, FinanceTransaction, FinanceTransactionSplit } from "./financesTypes";

export type FinancesLedgerResponse = {
  month: string;
  range: { from: string; to: string };
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  splitsByTxId: Record<string, FinanceTransactionSplit[]>;
};

export async function fetchLedger(month?: string): Promise<FinancesLedgerResponse> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : "";
  const res = await fetch(`/api/finances/ledger${qs}`, { method: "GET" });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as FinancesLedgerResponse;
}

export type PatchTransaction = Partial<Pick<FinanceTransaction, "categoryId" | "status" | "note" | "reviewedAt">>;

export async function patchTransaction(id: string, patch: PatchTransaction): Promise<FinanceTransaction> {
  const res = await fetch(`/api/finances/transactions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as FinanceTransaction;
}

export async function putSplits(
  transactionId: string,
  splits: Array<Pick<FinanceTransactionSplit, "categoryId" | "splitAmountCents" | "note">>
): Promise<{ ok: true; splits: FinanceTransactionSplit[] }> {
  const res = await fetch(`/api/finances/transactions/${encodeURIComponent(transactionId)}/splits`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(splits),
  });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as { ok: true; splits: FinanceTransactionSplit[] };
}

async function safeText(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

export type CreateTransactionInput = {
  occurredOn: string; // YYYY-MM-DD
  merchantName: string;
  categoryId?: string | null;
  amountCents: number;
  note?: string | null;
};

export async function createTransaction(input: CreateTransactionInput): Promise<FinanceTransaction> {
  const res = await fetch(`/api/finances/transactions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as FinanceTransaction;
}

export async function seedLedger(month?: string, count?: number): Promise<{ ok: true; month: string; inserted: number }> {
  const res = await fetch(`/api/finances/ledger/seed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ month, count }),
  });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as { ok: true; month: string; inserted: number };
}