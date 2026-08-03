import { CURRENCY } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/config";

/**
 * Single currency, USD, two decimals — the contract pins all three. The
 * `currency` field on price responses exists but never varies yet, so it is not
 * threaded through; change this one function if that stops being true.
 */
export function formatAmount(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
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
