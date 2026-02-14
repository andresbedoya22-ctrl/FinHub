import TransactionsListClient from "./ui/TransactionsListClient";
import { resolveMonthFromSearchParams } from "../monthFallback";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <TransactionsListClient initialMonth={resolveMonthFromSearchParams(sp)} />;
}
