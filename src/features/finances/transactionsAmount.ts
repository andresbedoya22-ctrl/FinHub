export type TransactionDirection = "income" | "expense";

export function toSignedAmountCents(amountAbsCents: number, direction: TransactionDirection): number {
  const base = Math.max(0, Math.round(Number.isFinite(amountAbsCents) ? amountAbsCents : 0));
  return direction === "income" ? base : -base;
}

export function inferDirectionFromAmount(amountCents: number): TransactionDirection {
  return amountCents >= 0 ? "income" : "expense";
}
