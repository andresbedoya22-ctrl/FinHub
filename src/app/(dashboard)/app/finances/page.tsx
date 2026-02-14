import FinancesOverviewClient from "./FinancesOverviewClient";
import { resolveMonthFromSearchParams } from "./monthFallback";

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <FinancesOverviewClient initialMonth={resolveMonthFromSearchParams(sp)} />;
}
