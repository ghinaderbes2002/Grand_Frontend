import Link from "next/link";
import { notFound } from "next/navigation";

import { PERMISSIONS, canAny } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function AdminOverviewPage({ params }: PageProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin`);

  const cards = [
    {
      href: `/${lang}/admin/categories`,
      title: dict.admin.categories.title,
      body: dict.admin.categories.subtitle,
      allowed: canAny(session, [
        PERMISSIONS.categoriesCreate,
        PERMISSIONS.categoriesUpdate,
        PERMISSIONS.categoriesDelete,
      ]),
    },
    {
      href: `/${lang}/admin/attributes`,
      title: dict.admin.attributes.title,
      body: dict.admin.attributes.subtitle,
      allowed: canAny(session, [
        PERMISSIONS.attributesCreate,
        PERMISSIONS.attributesUpdate,
        PERMISSIONS.attributesDelete,
      ]),
    },
    {
      href: `/${lang}/admin/brands`,
      title: dict.admin.brands.title,
      body: dict.admin.brands.subtitle,
      allowed: canAny(session, [
        PERMISSIONS.productsCreate,
        PERMISSIONS.productsUpdate,
        PERMISSIONS.productsDelete,
      ]),
    },
    {
      href: `/${lang}/admin/products`,
      title: dict.admin.products.title,
      body: dict.admin.products.subtitle,
      allowed: canAny(session, [PERMISSIONS.productsRead, PERMISSIONS.productsCreate]),
    },
    {
      href: `/${lang}/admin/warehouses`,
      title: dict.admin.warehouses.title,
      body: dict.admin.warehouses.subtitle,
      allowed: canAny(session, [PERMISSIONS.warehousesManage]),
    },
    {
      href: `/${lang}/admin/orders`,
      title: dict.admin.orders.title,
      body: dict.admin.orders.subtitle,
      allowed: canAny(session, [PERMISSIONS.ordersRead]),
    },
    {
      href: `/${lang}/admin/imports`,
      title: dict.admin.imports.title,
      body: dict.admin.imports.subtitle,
      allowed: canAny(session, [PERMISSIONS.importsManage]),
    },
  ].filter((card) => card.allowed);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="border-border hover:bg-surface flex flex-col gap-2 rounded-xl border p-5 transition"
        >
          <span className="font-medium">{card.title}</span>
          <span className="text-muted text-sm">{card.body}</span>
        </Link>
      ))}
    </div>
  );
}
