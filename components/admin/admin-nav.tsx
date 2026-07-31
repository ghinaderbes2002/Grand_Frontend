"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { stripLocale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

export type AdminNavItem = { href: string; label: string };

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const { dict } = useI18n();
  const route = stripLocale(usePathname());

  return (
    <nav className="flex flex-wrap gap-1" aria-label={dict.admin.title}>
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
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground hover:bg-surface"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
