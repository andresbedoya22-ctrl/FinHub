import FinancesOverviewClient from "./FinancesOverviewClient";

function resolveMonthFromSearch(searchParams: { month?: string | string[] | undefined }): string {
  const raw = Array.isArray(searchParams.month) ? searchParams.month[0] : searchParams.month;
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <FinancesOverviewClient initialMonth={resolveMonthFromSearch(sp)} />;
}
