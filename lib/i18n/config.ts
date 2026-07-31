export const locales = ["ar", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

/** Cookie the locale switcher writes so the proxy can honour an explicit choice. */
export const LOCALE_COOKIE = "NEXT_LOCALE";
/** One year — a language preference has no reason to expire sooner. */
export const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

const directions: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getDirection(locale: Locale) {
  return directions[locale];
}

/** `/ar/products` -> `ar`, `/products` -> null */
export function localeFromPathname(pathname: string): Locale | null {
  const segment = pathname.split("/")[1] ?? "";
  return isLocale(segment) ? segment : null;
}

/** Strips the locale prefix: `/ar/products` -> `/products`, `/ar` -> `/` */
export function stripLocale(pathname: string) {
  const locale = localeFromPathname(pathname);
  if (!locale) return pathname;
  return pathname.slice(locale.length + 1) || "/";
}

export function withLocale(locale: Locale, pathname: string) {
  const rest = stripLocale(pathname);
  return rest === "/" ? `/${locale}` : `/${locale}${rest}`;
}
