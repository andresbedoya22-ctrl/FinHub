import type { FinanceCategory, FinanceTransaction } from "./financesTypes";

function escapeCsv(value: unknown): string {
  const s = String(value ?? "");
  const needsQuotes = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function buildTransactionsCsv(args: {
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
}): string {
  const byId: Record<string, FinanceCategory> = {};
  for (const c of args.categories) byId[c.id] = c;

  const header = ["date", "merchant", "category", "amount_eur", "status", "note"].join(",");

  const lines = args.transactions
    .slice()
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn))
    .map((t) => {
      const categoryLabel =
        t.categoryId ? (byId[t.categoryId]?.label ?? "Uncategorized") : "Uncategorized";
      const amountEur = (t.amountCents / 100).toFixed(2);
      return [
        escapeCsv(t.occurredOn),
        escapeCsv(t.merchantName),
        escapeCsv(categoryLabel),
        escapeCsv(amountEur),
        escapeCsv(t.status),
        escapeCsv(t.note ?? ""),
      ].join(",");
    });

  return [header, ...lines].join("\n") + "\n";
}

export function downloadCsv(filename: string, csvText: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}