"use client";

import { useI18n } from "@/lib/i18n/context";

/**
 * Wraps a route's skeleton so screen readers are told a navigation is in
 * flight. The shapes themselves are `aria-hidden`, and silence would leave a
 * keyboard user with no idea the page is loading.
 *
 * A client component because `loading.tsx` receives no params — the locale has
 * to come from context, which the root layout's provider supplies.
 */
export function LoadingRegion({ children }: { children: React.ReactNode }) {
  const { dict } = useI18n();

  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">{dict.common.loading}</span>
      {children}
    </div>
  );
}
