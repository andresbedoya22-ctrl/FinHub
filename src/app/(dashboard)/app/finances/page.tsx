import FinancesOverviewClient from "./FinancesOverviewClient";

function isValidMonth(input: string): boolean {
  return /^\d{4}-\d{2}$/.test(input);
}

function currentMonthUtc(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export default async function FinancesPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams;
  const monthRaw = searchParams.month;
  const month = typeof monthRaw === "string" && isValidMonth(monthRaw) ? monthRaw : currentMonthUtc();
  return <FinancesOverviewClient initialMonth={month} />;
}
