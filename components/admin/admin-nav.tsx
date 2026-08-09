"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { stripLocale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

export type AdminNavItem = {
  href: string;
  label: string;
  /** Rendered at 20px; see components/admin/icons.tsx. */
  icon: React.ReactNode;
};

export function AdminNav({
  items,
  /** The sidebar stacks; the small-screen fallback scrolls sideways. */
  orientation = "vertical",
}: {
  items: AdminNavItem[];
  orientation?: "vertical" | "horizontal";
}) {
  const { dict } = useI18n();
  const route = stripLocale(usePathname());
  const vertical = orientation === "vertical";

  return (
    <nav
      className={vertical ? "flex flex-col gap-1" : "flex gap-1"}
      aria-label={dict.admin.title}
    >
      {items.map((item) => {
        // `/admin` must not light up for `/admin/brands`, hence the exact check
        // for the overview link.
        const target = stripLocale(item.href);
        const active =
          target === "/admin" ? route === "/admin" : route.startsWith(target);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
              vertical ? "" : "shrink-0 whitespace-nowrap"
            } ${
              active
                ? "bg-accent/10 text-accent-strong font-medium"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            <span className={active ? "text-accent-strong" : ""}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
