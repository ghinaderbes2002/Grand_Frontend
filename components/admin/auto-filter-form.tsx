"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useTransition, type ReactNode } from "react";

import { useI18n } from "@/lib/i18n/context";

/** How long typing has to pause before the list refreshes. */
const DEBOUNCE_MS = 300;

/**
 * A GET filter form that applies itself — no "Apply" button to press.
 *
 * Choices (a select, a date, a checkbox) apply the moment they change; typed
 * fields (search, numbers) apply once typing pauses. Either way the form's
 * values replace the URL's query and the server re-renders the list, so the
 * filters survive a reload and the back button.
 *
 * Empty fields are left out of the URL rather than sent as `?q=&status=`, and
 * any paging cursor is dropped: a new filter starts again from the first page.
 *
 * The submit button is kept, visually hidden, so Enter still applies at once
 * and the form keeps working with JavaScript off.
 */
export function AutoFilterForm({
  className = "",
  showSpinner = true,
  children,
}: {
  className?: string;
  /** Off where the corner is already taken, e.g. by a clear button. */
  showSpinner?: boolean;
  children: ReactNode;
}) {
  const { dict } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [pending, startTransition] = useTransition();

  useEffect(() => () => clearTimeout(timer.current), []);

  function apply() {
    clearTimeout(timer.current);
    const form = formRef.current;
    if (!form) return;

    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (key === "cursor" || typeof value !== "string") continue;
      if (value.trim() !== "") params.set(key, value.trim());
    }

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function onChange(event: React.FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const typed =
      target instanceof HTMLInputElement &&
      ["text", "search", "number", "email", "tel"].includes(target.type);

    // Both events fire for most controls; each kind listens to one of them,
    // so a select applies once rather than twice.
    if (typed && event.type === "input") {
      clearTimeout(timer.current);
      timer.current = setTimeout(apply, DEBOUNCE_MS);
    } else if (!typed && event.type === "change") {
      apply();
    }
  }

  return (
    <form
      ref={formRef}
      method="get"
      role="search"
      aria-busy={pending || undefined}
      onInput={onChange}
      // Selects and date pickers report through `change`, not always `input`.
      onChange={onChange}
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
      className={`relative ${className}`}
    >
      {children}

      <button type="submit" className="sr-only">
        {dict.admin.filters.apply}
      </button>

      {/* A quiet spinner in the corner while the list refreshes. */}
      {pending && showSpinner ? (
        <span
          aria-hidden="true"
          className="border-muted absolute top-3 end-3 size-4 animate-spin rounded-full border-2 border-t-transparent"
        />
      ) : null}
    </form>
  );
}
