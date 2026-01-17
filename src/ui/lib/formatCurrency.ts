const SUPPORTED_LOCALES = new Set(["en", "es", "pl", "ro"]);

type FormatCurrencyArgs = {
  cents: number;
  locale: string;
  compact?: boolean;
};

function normalizeLocale(locale: string): string {
  const base = locale.toLowerCase().split("-")[0] || "en";
  return SUPPORTED_LOCALES.has(base) ? base : "en";
}

export function formatCurrencyEUR({ cents, locale, compact }: FormatCurrencyArgs): string {
  const normalized = normalizeLocale(locale);
  const amount = cents / 100;
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "symbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  };

  if (compact) {
    options.notation = "compact";
    options.compactDisplay = "short";
    options.maximumFractionDigits = 1;
  }

  return new Intl.NumberFormat(normalized, options).format(amount);
}
