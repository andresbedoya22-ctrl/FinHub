import type { FinanceCategory, FinanceTransaction, IsoMonth } from "../financesTypes";
import { DEFAULT_CATEGORIES } from "../financesConfig";
import { isoMonthFromDate, isoDateFromDate, normalizeMerchant } from "../financesFormat";

type MockBundle = {
  month: IsoMonth;
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
};

function seeded(n: number): () => number {
  let x = Math.max(1, Math.trunc(n)) % 2147483647;
  return () => (x = (x * 48271) % 2147483647) / 2147483647;
}

function catIdFromKey(key: string): string {
  return `cat_${key}`;
}

export function buildMockFinancesBundle(now = new Date()): MockBundle {
  const month = isoMonthFromDate(now);
  const rng = seeded(Number(now.getFullYear()) * 100 + (now.getMonth() + 1));

  const categories: FinanceCategory[] = DEFAULT_CATEGORIES.map((c) => ({
    id: catIdFromKey(c.key),
    key: c.key,
    label: c.label,
    sortOrder: c.sortOrder,
    isSystem: c.isSystem,
  }));

  const merchants = [
    "Albert Heijn",
    "Jumbo",
    "NS",
    "Uber",
    "Bol.com",
    "Ziggo",
    "Vodafone",
    "Hema",
    "Action",
    "Basic-Fit",
    "Spotify",
    "AWS",
    "Belastingdienst",
    "Apotheek",
  ];

  const catKeys = categories.map((c) => c.key);

  function pick<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error("pick() requires non-empty array");
  const idx = Math.floor(rng() * arr.length);
  return arr[idx]!;
}

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const txs: FinanceTransaction[] = [];

  // Income (positive)
  txs.push({
    id: "tx_income_salary",
    occurredOn: `${month}-01`,
    merchantName: "Sueldo",
    merchantNorm: normalizeMerchant("Sueldo"),
    categoryId: null,
    amountCents: Math.round((2800 + rng() * 1200) * 100),
    currency: "EUR",
    status: "approved",
    source: "manual",
    note: "Ingreso mensual",
  });

  // Fixed-ish expenses (negative)
  const fixed = [
    { name: "Alquiler", amount: -Math.round((850 + rng() * 450) * 100), cat: "housing" },
    { name: "Seguro", amount: -Math.round((120 + rng() * 80) * 100), cat: "insurance" },
    { name: "Internet", amount: -Math.round((40 + rng() * 30) * 100), cat: "utilities" },
    { name: "Móvil", amount: -Math.round((20 + rng() * 40) * 100), cat: "utilities" },
  ];

  for (const f of fixed) {
    txs.push({
      id: `tx_fixed_${f.name.toLowerCase()}`,
      occurredOn: `${month}-03`,
      merchantName: f.name,
      merchantNorm: normalizeMerchant(f.name),
      categoryId: catIdFromKey(f.cat),
      amountCents: f.amount,
      currency: "EUR",
      status: "approved",
      source: "manual",
      note: "Gasto fijo",
    });
  }

  // Variable expenses across days
  for (let d = 1; d <= daysInMonth; d++) {
    // ~70% days have some expense
    if (rng() < 0.30) continue;

    const txCount = 1 + Math.floor(rng() * 2); // 1..2
    for (let i = 0; i < txCount; i++) {
      const merchant = pick(merchants);
      const isPending = rng() < 0.25;

      // Amounts mainly negative (expenses)
      const amount = -Math.round((6 + rng() * 90) * 100);

      // Category mapping heuristic
      let catKey = pick(catKeys);
      if (/ah|jumbo/i.test(merchant)) catKey = "groceries";
      if (/uber|ns/i.test(merchant)) catKey = "transport";
      if (/ziggo|vodafone/i.test(merchant)) catKey = "utilities";
      if (/spotify/i.test(merchant)) catKey = "subscriptions";
      if (/aws/i.test(merchant)) catKey = "subscriptions";
      if (/belasting/i.test(merchant)) catKey = "taxes";
      if (/apotheek/i.test(merchant)) catKey = "health";

      const occurredOn = isoDateFromDate(new Date(now.getFullYear(), now.getMonth(), d));

      txs.push({
        id: `tx_${month}_${d}_${i}_${Math.floor(rng() * 1e6)}`,
        occurredOn,
        merchantName: merchant,
        merchantNorm: normalizeMerchant(merchant),
        categoryId: catIdFromKey(catKey),
        amountCents: amount,
        currency: "EUR",
        status: isPending ? "pending" : "approved",
        source: isPending ? "ocr" : "manual",
        note: null,
      });
    }
  }

  return { month, categories, transactions: txs };
}