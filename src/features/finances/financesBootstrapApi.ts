import type { FinanceUserPlan } from "./financesTypes";

export type FinanceRulesV1 = {
  version: 1;
  safeToSpendMode: "income-expense-fixedRemaining";
};

export type FinanceBootstrapDTO = {
  plan: FinanceUserPlan;
  rules: FinanceRulesV1;
};

async function parseOrThrow(res: Response) {
  const txt = await res.text();
  const json = txt ? JSON.parse(txt) : null;
  if (!res.ok) {
    const msg = json?.error ? String(json.error) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function getFinancesBootstrap(): Promise<FinanceBootstrapDTO> {
  const res = await fetch("/api/finances/bootstrap", { method: "GET", cache: "no-store" });
  return parseOrThrow(res) as Promise<FinanceBootstrapDTO>;
}

export async function saveFinancesBootstrap(dto: FinanceBootstrapDTO): Promise<void> {
  const res = await fetch("/api/finances/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(dto),
  });
  await parseOrThrow(res);
}