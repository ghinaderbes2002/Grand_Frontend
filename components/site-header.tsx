import Link from "next/link";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { getCart } from "@/lib/api/orders";
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

  // Only for the badge — a failure here just hides the count, it must not cost
  // the visitor their header.
  const cart = session ? await getCart().catch(() => null) : null;
  const cartCount = cart?.items.length ?? 0;

  return (
    <header className="border-border bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link href={`/${locale}`} className="flex items-center gap-2.5">
          <span className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-xl text-sm font-bold">
            {dict.common.appName.charAt(0)}
          </span>
          <span className="hidden font-semibold sm:inline">{dict.common.appName}</span>
        </Link>

        <NavLink href={`/${locale}/shop`}>{dict.shop.title}</NavLink>

        <div className="flex-1" />

        <LocaleSwitcher />

        {session ? (
          <>
            {canAny(session, ADMIN_PERMISSIONS) ? (
              <NavLink href={`/${locale}/admin`} hideOnMobile>
                {dict.nav.admin}
              </NavLink>
            ) : null}

            <NavLink href={`/${locale}/orders`} hideOnMobile>
              {dict.admin.orders.myOrders}
            </NavLink>

            {/* Stays visible on mobile: it is the only way to reach
                "log out everywhere" once the header folds. */}
            <NavLink href={`/${locale}/account`}>{dict.nav.account}</NavLink>

            <Link
              href={`/${locale}/cart`}
              className="border-border hover:bg-surface flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition"
            >
              {dict.cart.title}
              {cartCount > 0 ? (
                <span className="bg-accent text-accent-foreground flex size-5 items-center justify-center rounded-full text-xs font-semibold">
                  {cartCount}
                </span>
              ) : null}
            </Link>

            <form action={logoutAction.bind(null, locale)} className="hidden md:block">
              <Button variant="ghost" type="submit" className="h-9">
                {dict.nav.logout}
              </Button>
            </form>
          </>
        ) : (
          <>
            <NavLink href={`/${locale}/login`}>{dict.nav.login}</NavLink>
            <Link href={`/${locale}/register`}>
              <Button className="h-9">{dict.nav.register}</Button>
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
