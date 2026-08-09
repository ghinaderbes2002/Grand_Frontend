"use client";

import { useCallback, useRef, type ReactNode } from "react";

import { SiteNav, type SiteNavItem } from "@/components/site-nav";
import { useI18n } from "@/lib/i18n/context";

/**
 * The navigation, for the screens the header's own row is too narrow to hold.
 *
 * Below `md` the main nav folds away and the admin link with it, which left a
 * phone with no route to the shop, the categories or the FAQ other than the
 * home page's own buttons. This is that route.
 *
 * A full-screen `<dialog>` rather than a dropdown: the platform gives focus
 * trapping, Escape, inertness of the page behind and a top layer that the
 * sticky header's `z-index` cannot beat — and at this width a panel would cover
 * the screen anyway.
 */
export function SiteMenu({
  items,
  children,
}: {
  items: SiteNavItem[];
  /** Anything that belongs under the nav — the signed-out account actions. */
  children?: ReactNode;
}) {
  const { dict } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  const close = useCallback(() => ref.current?.close(), []);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-label={dict.nav.menu}
        title={dict.nav.menu}
        className="border-border hover:bg-surface flex size-10 items-center justify-center rounded-full border transition md:hidden"
      >
        <MenuIcon className="size-4.5" />
      </button>

      <dialog
        ref={ref}
        aria-label={dict.nav.menu}
        // Fills the viewport: the default dialog box is centred and sized to
        // its content, which on a phone reads as a stray card.
        className="bg-background text-foreground m-0 h-dvh max-h-none w-dvw max-w-none p-0 backdrop:bg-black/50"
      >
        <div className="flex h-full flex-col gap-6 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-eyebrow">{dict.nav.menu}</span>
            <button
              type="button"
              onClick={close}
              aria-label={dict.common.close}
              className="border-border hover:bg-surface flex size-10 items-center justify-center rounded-full border text-lg leading-none transition"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          {/* Closing on the way out: the links navigate client-side, and the
              dialog would otherwise stay open over the page it moved to. The
              handler sits on the wrapper so it catches every link at once. */}
          <div onClick={close} className="flex flex-col gap-4">
            <SiteNav
              items={items}
              label={dict.nav.menu}
              size="lg"
              className="flex flex-col gap-1"
            />
            {children}
          </div>
        </div>
      </dialog>
    </>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
