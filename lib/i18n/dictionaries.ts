import type { Locale } from "./config";

import ar from "./dictionaries/ar.json";
import en from "./dictionaries/en.json";

/**
 * `ar.json` is the source of truth for the shape; `en.json` is type-checked
 * against it, so a key added to one and forgotten in the other fails the build.
 */
export type Dictionary = typeof ar;

const dictionaries: Record<Locale, Dictionary> = {
  ar,
  en: en satisfies Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
