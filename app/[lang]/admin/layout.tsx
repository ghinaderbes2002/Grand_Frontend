import { notFound } from "next/navigation";

import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav";
import { NoAccess } from "@/components/admin/no-access";
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
      item: { href: `/${lang}/admin`, label: dict.admin.overview },
      allowed: true,
    },
    {
      item: { href: `/${lang}/admin/categories`, label: dict.admin.nav.categories },
      allowed: canAny(session, [
        PERMISSIONS.categoriesCreate,
        PERMISSIONS.categoriesUpdate,
        PERMISSIONS.categoriesDelete,
      ]),
    },
    {
      item: { href: `/${lang}/admin/attributes`, label: dict.admin.nav.attributes },
      allowed: canAny(session, [
        PERMISSIONS.attributesCreate,
        PERMISSIONS.attributesUpdate,
        PERMISSIONS.attributesDelete,
      ]),
    },
    {
      item: { href: `/${lang}/admin/brands`, label: dict.admin.nav.brands },
      allowed: canAny(session, [
        PERMISSIONS.productsCreate,
        PERMISSIONS.productsUpdate,
        PERMISSIONS.productsDelete,
      ]),
    },
    {
      item: { href: `/${lang}/admin/products`, label: dict.admin.nav.products },
      allowed: canAny(session, [PERMISSIONS.productsRead, PERMISSIONS.productsCreate]),
    },
    {
      item: { href: `/${lang}/admin/warehouses`, label: dict.admin.nav.warehouses },
      allowed: canAny(session, [PERMISSIONS.warehousesManage]),
    },
    {
      item: { href: `/${lang}/admin/orders`, label: dict.admin.orders.title },
      allowed: canAny(session, [PERMISSIONS.ordersRead]),
    },
    {
      item: { href: `/${lang}/admin/imports`, label: dict.admin.imports.title },
      allowed: canAny(session, [PERMISSIONS.importsManage]),
    },
  ];

  const visible = sections.filter((section) => section.allowed);

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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{dict.admin.title}</h1>
        <AdminNav items={visible.map((section) => section.item)} />
      </div>
      {children}
    </div>
  );
}
