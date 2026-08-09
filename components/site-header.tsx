import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { PERMISSIONS, canAny } from "@/lib/auth/permissions";
import { getSessionOrNull } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** Any one of these means the account has something to do in the admin area. */
const ADMIN_PERMISSIONS = [
  PERMISSIONS.categoriesCreate,
  PERMISSIONS.categoriesUpdate,
  PERMISSIONS.categoriesDelete,
  PERMISSIONS.attributesCreate,
  PERMISSIONS.attributesUpdate,
  PERMISSIONS.attributesDelete,
  PERMISSIONS.productsCreate,
  PERMISSIONS.productsUpdate,
  PERMISSIONS.productsDelete,
];

export async function SiteHeader({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  // Chrome degrades to the logged-out state if the API is down, rather than
  // taking every page with it.
  const session = await getSessionOrNull();

  return (
    <header className="border-border bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link href={`/${locale}`}>
          <Logo name={dict.common.appName} markClassName="size-8" responsive />
        </Link>

        {/* The main nav, centred. Every entry is a route that exists — no
            "About"/"Contact" placeholders pointing nowhere. */}
        <SiteNav
          label={dict.nav.home}
          className="hidden flex-1 items-center justify-center gap-1 md:flex"
          items={[
            { href: `/${locale}`, label: dict.nav.home },
            { href: `/${locale}/shop`, label: dict.shop.title },
            { href: `/${locale}/categories`, label: dict.nav.categories },
            { href: `/${locale}/faq`, label: dict.nav.faq },
          ]}
        />

        <div className="flex-1 md:hidden" />

        <LocaleSwitcher />

        {session ? (
          <>
            {canAny(session, ADMIN_PERMISSIONS) ? (
              <NavLink href={`/${locale}/admin`} hideOnMobile>
                {dict.nav.admin}
              </NavLink>
            ) : null}

            {/* "My orders" and the cart are parked for now — reachable from
                the account page, off the header. Restore them by putting the
                links back here; nothing else depends on their absence. */}
            <Link
              href={`/${locale}/account`}
              aria-label={dict.nav.account}
              title={dict.nav.account}
              className="border-border hover:bg-surface flex size-10 items-center justify-center rounded-full border transition"
            >
              <AccountIcon className="size-4.5" />
            </Link>

            {/* Last in the DOM, so it lands at the far end of the bar — the
                left in Arabic, the right in English. An icon, matching the
                account button beside it. */}
            <LogoutButton
              label={dict.nav.logout}
              className="border-border text-muted hover:border-danger/50 hover:text-danger flex size-10 items-center justify-center rounded-full border transition"
            >
              <LogoutIcon className="size-4.5" />
            </LogoutButton>
          </>
        ) : (
          <>
            <NavLink href={`/${locale}/login`}>{dict.nav.login}</NavLink>
            <Link href={`/${locale}/register`}>
              <Button size="sm">{dict.nav.register}</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  /** Secondary links fold away on narrow screens rather than wrapping. */
  hideOnMobile = false,
}: {
  href: string;
  children: React.ReactNode;
  hideOnMobile?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-muted hover:text-foreground text-sm whitespace-nowrap transition ${
        hideOnMobile ? "hidden md:inline" : ""
      }`}
    >
      {children}
    </Link>
  );
}

/** A person outline, matching the stroked house style of the other icons. */
function AccountIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

/** An arrow leaving a doorway. Mirrored in RTL so it still points "out". */
function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${className} rtl:-scale-x-100`}
    >
      <path d="M15 17l5-5-5-5M20 12H9" />
      <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" />
    </svg>
  );
}
