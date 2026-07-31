"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  defaultLocale,
  isLocale,
  withLocale,
} from "./config";

/**
 * Switches language. Done server-side so the preference cookie is written the
 * same way as every other cookie in this app, and so the switcher keeps working
 * without client-side JavaScript.
 */
export async function setLocaleAction(formData: FormData) {
  const requested = String(formData.get("locale") ?? "");
  const locale = isLocale(requested) ? requested : defaultLocale;
  const pathname = safePathname(formData.get("pathname"));

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  redirect(withLocale(locale, pathname));
}

/** Guards against a crafted `pathname` turning the switcher into an open redirect. */
function safePathname(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}
