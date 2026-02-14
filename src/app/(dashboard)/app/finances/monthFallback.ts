export function monthFromDate(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function resolveMonthFromSearchParams(
  searchParams: { month?: string | string[] | undefined },
  now = new Date()
): string {
  const raw = Array.isArray(searchParams.month) ? searchParams.month[0] : searchParams.month;
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  return monthFromDate(now);
}
