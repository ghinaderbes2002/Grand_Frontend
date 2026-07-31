"use client";

import { createContext, use } from "react";

import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries";

type I18nValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  dict: Dictionary;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  value,
  children,
}: {
  value: I18nValue;
  children: React.ReactNode;
}) {
  return <I18nContext value={value}>{children}</I18nContext>;
}

/** Client-side access to the dictionary loaded by the nearest server layout. */
export function useI18n() {
  const value = use(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return value;
}
