import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
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

        {/* The main nav, centred. Every entry is a route or an anchor that
            exists — no "About"/"Contact" placeholders pointing nowhere. */}
        <nav
          aria-label={dict.nav.home}
          className="hidden flex-1 items-center justify-center gap-7 md:flex"
        >
          <NavLink href={`/${locale}`}>{dict.nav.home}</NavLink>
          <NavLink href={`/${locale}/shop`}>{dict.shop.title}</NavLink>
          {/* Absolute, so it still works from a product page: it navigates
              home first, then scrolls. */}
          <NavLink href={`/${locale}#categories`}>{dict.nav.categories}</NavLink>
        </nav>

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

            <form action={logoutAction.bind(null, locale)} className="hidden md:block">
              <Button variant="ghost" size="sm" type="submit">
                {dict.nav.logout}
              </Button>
            </form>
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
