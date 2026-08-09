"use client";

import { usePathname } from "next/navigation";

import { setLocaleAction } from "@/lib/i18n/actions";
import { locales, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

/**
 * The language switch: one button, showing the language it switches *to*.
 *
 * Two locales means the segmented control it replaced spent half its width
 * telling the reader what they were already reading. A single button naming the
 * other language is the whole interaction, and it stays honest if a third
 * locale is added — the button then cycles rather than lying about being a
 * toggle.
 *
 * Still a plain form posting to a server action, so it works with JavaScript
 * off and the choice is written to the cookie the proxy reads.
 */
export function LocaleSwitcher() {
  const { locale, dict } = useI18n();
  const pathname = usePathname();

  const labels: Record<Locale, string> = {
    ar: dict.common.arabic,
    en: dict.common.english,
  };

  const next = locales[(locales.indexOf(locale) + 1) % locales.length];

  return (
    <form action={setLocaleAction}>
      <input type="hidden" name="pathname" value={pathname} />
      <button
        type="submit"
        name="locale"
        value={next}
        // The visible label is just a language name; on its own it does not say
        // what the button does, so the accessible name spells it out.
        aria-label={`${dict.common.language}: ${labels[next]}`}
        className="border-border hover:bg-surface hover:border-accent/50 flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition"
      >
        <GlobeIcon className="text-muted size-4.5 shrink-0" />
        {/* The name is written in its own language, so it reads as an offer to
            switch rather than as a translated label. */}
        <span lang={next}>{labels[next]}</span>
      </button>
    </form>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      {/* The two meridians that make a sphere read as a globe rather than as a
          target. */}
      <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
    </svg>
  );
}
