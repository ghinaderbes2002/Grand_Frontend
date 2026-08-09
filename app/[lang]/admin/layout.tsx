import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav";
import {
  AdminLogoutButton,
  AdminSidebarUser,
} from "@/components/admin/admin-sidebar-user";
import {
  AttributesIcon,
  BrandsIcon,
  CategoriesIcon,
  CouponsIcon,
  CustomersIcon,
  ImportsIcon,
  OrdersIcon,
  OverviewIcon,
  ProductsIcon,
  ReportsIcon,
  StoreIcon,
  UsersIcon,
  WarehousesIcon,
} from "@/components/admin/icons";
import { NoAccess } from "@/components/admin/no-access";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PERMISSIONS, canAny } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** Nothing behind the login belongs in a search index. */
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children, params }: LayoutProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin`);

  const sections: Array<{ item: AdminNavItem; allowed: boolean }> = [
    {
      item: {
        href: `/${lang}/admin`,
        label: dict.admin.overview,
        icon: <OverviewIcon />,
      },
      allowed: true,
    },
    {
      item: {
        href: `/${lang}/admin/products`,
        label: dict.admin.nav.products,
        icon: <ProductsIcon />,
      },
      allowed: canAny(session, [PERMISSIONS.productsRead, PERMISSIONS.productsCreate]),
    },
    {
      item: {
        href: `/${lang}/admin/categories`,
        label: dict.admin.nav.categories,
        icon: <CategoriesIcon />,
      },
      allowed: canAny(session, [
        PERMISSIONS.categoriesCreate,
        PERMISSIONS.categoriesUpdate,
        PERMISSIONS.categoriesDelete,
      ]),
    },
    {
      item: {
        href: `/${lang}/admin/attributes`,
        label: dict.admin.nav.attributes,
        icon: <AttributesIcon />,
      },
      allowed: canAny(session, [
        PERMISSIONS.attributesCreate,
        PERMISSIONS.attributesUpdate,
        PERMISSIONS.attributesDelete,
      ]),
    },
    {
      item: {
        href: `/${lang}/admin/brands`,
        label: dict.admin.nav.brands,
        icon: <BrandsIcon />,
      },
      allowed: canAny(session, [
        PERMISSIONS.productsCreate,
        PERMISSIONS.productsUpdate,
        PERMISSIONS.productsDelete,
      ]),
    },
    {
      item: {
        href: `/${lang}/admin/orders`,
        label: dict.admin.orders.title,
        icon: <OrdersIcon />,
      },
      allowed: canAny(session, [PERMISSIONS.ordersRead]),
    },
    {
      item: {
        href: `/${lang}/admin/warehouses`,
        label: dict.admin.nav.warehouses,
        icon: <WarehousesIcon />,
      },
      allowed: canAny(session, [PERMISSIONS.warehousesManage]),
    },
    {
      item: {
        href: `/${lang}/admin/reports`,
        label: dict.admin.nav.reports,
        icon: <ReportsIcon />,
      },
      allowed: canAny(session, [PERMISSIONS.reportsView]),
    },
    {
      item: {
        href: `/${lang}/admin/coupons`,
        label: dict.admin.nav.coupons,
        icon: <CouponsIcon />,
      },
      allowed: canAny(session, [PERMISSIONS.promotionsManage]),
    },
    {
      item: {
        href: `/${lang}/admin/imports`,
        label: dict.admin.imports.title,
        icon: <ImportsIcon />,
      },
      allowed: canAny(session, [PERMISSIONS.importsManage]),
    },
    {
      item: {
        href: `/${lang}/admin/customers`,
        label: dict.admin.nav.customers,
        icon: <CustomersIcon />,
      },
      allowed: canAny(session, [PERMISSIONS.pricesUpdate]),
    },
    {
      item: {
        href: `/${lang}/admin/users`,
        label: dict.admin.nav.users,
        icon: <UsersIcon />,
      },
      allowed: canAny(session, [PERMISSIONS.usersManage]),
    },
  ];

  const visible = sections.filter((section) => section.allowed);
  const items = visible.map((section) => section.item);

  // Nothing beyond the overview means this account has no business here at all.
  // Each page still guards itself — this only decides what the shell shows.
  if (visible.length <= 1) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4">
        <NoAccess locale={lang} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh w-full">
      {/* Sticky rather than fixed: it scrolls on its own without the main
          column needing a margin that would have to flip per direction. */}
      <aside className="border-border bg-surface/40 sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-e p-5 lg:flex">
        <Link href={`/${lang}/admin`} className="px-1">
          <Logo name={dict.common.appName} markClassName="size-9" />
        </Link>

        <div className="flex-1">
          <AdminNav items={items} />
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href={`/${lang}/shop`}
            className="text-muted hover:bg-surface hover:text-foreground flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition"
          >
            <StoreIcon />
            {dict.admin.backToStore}
          </Link>
          <AdminSidebarUser session={session} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-background/80 sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-lg font-semibold">
              {dict.admin.greeting} {dict.roles[session.roleKey]} 👋
            </p>
            <p className="text-muted truncate text-sm">{dict.admin.greetingSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            {/* Without the sidebar there is no other way out on small screens. */}
            <span className="lg:hidden">
              <AdminLogoutButton compact />
            </span>
          </div>
        </header>

        {/* The sidebar is hidden below `lg`, so the nav still has to be
            reachable there. */}
        <div className="border-border overflow-x-auto border-b px-3 py-2 lg:hidden">
          <AdminNav items={items} orientation="horizontal" />
        </div>

        <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
