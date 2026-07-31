import type { Locale } from "@/lib/i18n/config";

/**
 * The contract never names a currency, so amounts are formatted as plain
 * numbers rather than guessing a symbol. Swap in `style: "currency"` here once
 * the backend confirms one.
 */
export function formatAmount(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Short id for display — orders are identified by uuid in the API. */
export function shortId(id: string) {
  return id.slice(0, 8);
}
