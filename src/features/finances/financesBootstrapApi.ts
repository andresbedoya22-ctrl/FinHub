import type { FinancesBootstrap } from "./financesTypes";

async function parseOrThrow(res: Response) {
  const txt = await res.text();
  const json = txt ? JSON.parse(txt) : null;
  if (!res.ok) {
    const msg = json?.error ? String(json.error) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function getFinancesBootstrap(): Promise<FinancesBootstrap> {
  const res = await fetch("/api/finances/bootstrap", { method: "GET", cache: "no-store" });
  return parseOrThrow(res) as Promise<FinancesBootstrap>;
}

export async function saveFinancesBootstrap(dto: FinancesBootstrap): Promise<void> {
  const res = await fetch("/api/finances/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(dto),
  });
  await parseOrThrow(res);
}
