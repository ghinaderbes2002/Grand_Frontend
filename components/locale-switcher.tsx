"use client";

import { usePathname } from "next/navigation";

import { setLocaleAction } from "@/lib/i18n/actions";
import { locales, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

export function LocaleSwitcher() {
  const { locale, dict } = useI18n();
  const pathname = usePathname();

  const labels: Record<Locale, string> = {
    ar: dict.common.arabic,
    en: dict.common.english,
  };

  return (
    <form
      action={setLocaleAction}
      className="border-border flex items-center gap-1 rounded-lg border p-0.5"
      aria-label={dict.common.language}
    >
      <input type="hidden" name="pathname" value={pathname} />
      {locales.map((candidate) => (
        <button
          key={candidate}
          type="submit"
          name="locale"
          value={candidate}
          aria-current={candidate === locale ? "true" : undefined}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            candidate === locale
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          {labels[candidate]}
        </button>
      ))}
    </form>
  );
}
