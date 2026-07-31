import Link from "next/link";

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
    <header className="border-border bg-surface/60 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3">
        <Link href={`/${locale}`} className="font-semibold">
          {dict.common.appName}
        </Link>

        <Link
          href={`/${locale}/shop`}
          className="text-muted hover:text-foreground text-sm"
        >
          {dict.shop.title}
        </Link>

        <div className="flex-1" />

        <LocaleSwitcher />

        {session ? (
          <>
            {canAny(session, ADMIN_PERMISSIONS) ? (
              <Link
                href={`/${locale}/admin`}
                className="text-muted hover:text-foreground text-sm"
              >
                {dict.nav.admin}
              </Link>
            ) : null}
            <Link
              href={`/${locale}/cart`}
              className="text-muted hover:text-foreground text-sm"
            >
              {dict.cart.title}
            </Link>
            <Link
              href={`/${locale}/orders`}
              className="text-muted hover:text-foreground text-sm"
            >
              {dict.admin.orders.myOrders}
            </Link>
            <Link
              href={`/${locale}/account`}
              className="text-muted hover:text-foreground text-sm"
            >
              {dict.nav.account}
            </Link>
            <form action={logoutAction.bind(null, locale)}>
              <Button variant="ghost" type="submit" className="h-9">
                {dict.nav.logout}
              </Button>
            </form>
          </>
        ) : (
          <>
            <Link
              href={`/${locale}/login`}
              className="text-muted hover:text-foreground text-sm"
            >
              {dict.nav.login}
            </Link>
            <Link href={`/${locale}/register`}>
              <Button className="h-9">{dict.nav.register}</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
