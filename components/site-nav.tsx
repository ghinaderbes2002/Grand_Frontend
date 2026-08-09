"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { stripLocale } from "@/lib/i18n/config";

export type SiteNavItem = { href: string; label: string };

/**
 * The storefront's main navigation, with the current page marked by a filled
 * pill rather than by colour alone.
 *
 * A client component only because the active state needs the pathname, which a
 * server component has no access to. It renders nothing else, so the cost is a
 * list of links.
 *
 * `aria-current="page"` carries the same fact to a screen reader, which never
 * sees the pill.
 */
export function SiteNav({
  items,
  label,
  className = "",
}: {
  items: SiteNavItem[];
  label: string;
  className?: string;
}) {
  const route = stripLocale(usePathname());

  return (
    <nav aria-label={label} className={className}>
      {items.map((item) => {
        const target = stripLocale(item.href);
        // The home link must match exactly: every route starts with "/", so a
        // prefix test would leave it lit on every page of the site.
        const active = target === "/" ? route === "/" : route.startsWith(target);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm whitespace-nowrap transition ${
              active
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
