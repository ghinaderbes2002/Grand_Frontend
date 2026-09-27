"use client";

import { useI18n } from "@/lib/i18n/context";
import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * The light/dark switch.
 *
 * It holds no state: which icon shows is decided in CSS off the same selectors
 * as the tokens (`.theme-icon-*` in globals.css), so the server renders it
 * without knowing the visitor's theme and it is never wrong on first paint. A
 * click resolves the theme actually in effect — the attribute if one is set,
 * the system setting otherwise — and pins the opposite.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { dict } = useI18n();

  function toggle() {
    const root = document.documentElement;
    const current =
      root.dataset.theme ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";

    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage refused: the switch still works for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dict.common.toggleTheme}
      title={dict.common.toggleTheme}
      className={`border-border hover:bg-surface hover:border-accent/50 flex size-10 shrink-0 items-center justify-center rounded-full border transition ${className}`}
    >
      <MoonIcon />
      <SunIcon />
    </button>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="theme-icon-moon size-4.5"
    >
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      aria-hidden="true"
      className="theme-icon-sun size-4.5"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  );
}
