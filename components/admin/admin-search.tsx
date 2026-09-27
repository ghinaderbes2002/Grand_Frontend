"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { useI18n } from "@/lib/i18n/context";

/** How long typing has to pause before the list refreshes. */
const DEBOUNCE_MS = 250;

/**
 * The search box above an admin listing.
 *
 * Results follow the typing: after a short pause the `?q=` param is replaced
 * and the server re-renders the filtered list. The term lives in the URL, so a
 * reload or the back button keeps it. It is still a plain GET form underneath,
 * so Enter works — and the whole thing works with JavaScript off.
 */
export function AdminSearch({ placeholder }: { placeholder?: string }) {
  const { dict } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function push(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) params.set("q", next.trim());
    else params.delete("q");
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function onChange(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next), DEBOUNCE_MS);
  }

  return (
    <form
      method="get"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        clearTimeout(timer.current);
        push(value);
      }}
      // The focus ring belongs to the whole box, not the bare input inside it.
      className="border-border bg-card focus-within:border-accent focus-within:ring-accent/15 flex h-12 w-full items-center gap-2 rounded-2xl border ps-4 pe-1.5 transition focus-within:ring-4"
    >
      <SearchIcon pending={pending} />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? dict.admin.filters.searchPlaceholder}
        aria-label={dict.admin.filters.search}
        autoComplete="off"
        // `!`: the global focus-visible outline is unlayered CSS, which beats a
        // plain utility — without it the ring draws a box inside the pill.
        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none! [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={dict.admin.filters.clear}
          title={dict.admin.filters.clear}
          className="text-muted hover:bg-surface hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-xl transition"
        >
          <span aria-hidden="true">✕</span>
        </button>
      ) : null}
    </form>
  );
}

/** The magnifier, which turns into a small spinner while the list refreshes. */
function SearchIcon({ pending }: { pending: boolean }) {
  return pending ? (
    <span
      aria-hidden="true"
      className="border-muted size-4 shrink-0 animate-spin rounded-full border-2 border-t-transparent"
    />
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      className="text-muted size-4.5 shrink-0"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
