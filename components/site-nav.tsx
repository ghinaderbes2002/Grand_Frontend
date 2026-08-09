"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { RemoteImage } from "@/components/ui/remote-image";
import { stripLocale } from "@/lib/i18n/config";

/** A category under a nav entry, shown with its photograph in the panel. */
export type SiteNavChild = {
  id: string;
  href: string;
  label: string;
  imageUrl?: string | null;
};

export type SiteNavItem = {
  href: string;
  label: string;
  /** Turns the entry into a panel. Empty or absent leaves it a plain link. */
  children?: SiteNavChild[];
  /** The "all of them" link at the head of the panel, e.g. "كل الأصناف". */
  allLabel?: string;
};

/**
 * The storefront's main navigation, with the current page marked by a filled
 * pill rather than by colour alone.
 *
 * A client component only because the active state needs the pathname, which a
 * server component has no access to — and because an entry carrying categories
 * opens a panel.
 *
 * `aria-current="page"` carries the same fact to a screen reader, which never
 * sees the pill.
 */
export function SiteNav({
  items,
  label,
  className = "",
  size = "sm",
}: {
  items: SiteNavItem[];
  label: string;
  className?: string;
  /** `lg` for the mobile menu, where each row is a touch target. */
  size?: "sm" | "lg";
}) {
  const route = stripLocale(usePathname());
  // Named apart from the `item` the map below binds: shadowing it put the
  // object itself into `className`.
  const sizing = size === "lg" ? "px-4 py-3 text-base" : "px-4 py-2 text-sm";

  return (
    <nav aria-label={label} className={className}>
      {items.map((item) => {
        const target = stripLocale(item.href);
        // The home link must match exactly: every route starts with "/", so a
        // prefix test would leave it lit on every page of the site.
        const active = target === "/" ? route === "/" : route.startsWith(target);
        const itemClass = `rounded-full whitespace-nowrap transition ${sizing} ${
          active
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted hover:text-foreground"
        }`;

        // The panel needs room and a pointer; in the mobile menu the children
        // are simply listed under their parent instead.
        if (item.children?.length && size === "sm") {
          return <NavPanel key={item.href} item={item} className={itemClass} />;
        }

        return (
          <span key={item.href} className="contents">
            <Link href={item.href} aria-current={active ? "page" : undefined} className={itemClass}>
              {item.label}
            </Link>
            {item.children?.length
              ? item.children.map((child) => (
                  <Link
                    key={child.id}
                    href={child.href}
                    // Logical padding so the indent flips with the direction.
                    className="text-muted hover:text-foreground rounded-full py-2.5 pe-4 text-sm ps-9"
                  >
                    {child.label}
                  </Link>
                ))
              : null}
          </span>
        );
      })}
    </nav>
  );
}

/** A nav entry that opens its categories in a panel. */
function NavPanel({ item, className }: { item: SiteNavItem; className: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    // Pointer rather than click: the panel should be gone before whatever was
    // clicked behind it reacts.
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={`${className} inline-flex items-center gap-1.5`}
      >
        {item.label}
        <ChevronIcon className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          id={panelId}
          // Centred under the trigger with a physical translate: centring reads
          // the same in both writing directions, unlike an inset.
          className="border-border bg-background shadow-raised absolute top-full left-1/2 z-40 mt-3 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 rounded-3xl border p-3"
        >
          <Link
            href={item.href}
            onClick={() => setOpen(false)}
            className="text-muted hover:text-foreground block rounded-2xl px-3 py-2 text-start text-sm"
          >
            {item.allLabel ?? item.label}
          </Link>

          <ul className="grid gap-1 sm:grid-cols-2">
            {item.children?.map((child) => (
              <li key={child.id}>
                <Link
                  href={child.href}
                  onClick={() => setOpen(false)}
                  className="hover:bg-surface flex items-center gap-3 rounded-2xl p-2 transition"
                >
                  <span className="border-border bg-surface relative size-12 shrink-0 overflow-hidden rounded-full border">
                    {child.imageUrl ? (
                      // Decorative: the name is right beside it.
                      <RemoteImage src={child.imageUrl} alt="" sizes="3rem" />
                    ) : (
                      <span className="text-muted flex size-full items-center justify-center text-base font-semibold">
                        {child.label.charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-medium">{child.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
