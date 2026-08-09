import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AttributesIcon,
  BrandsIcon,
  CategoriesIcon,
  CouponsIcon,
  CustomersIcon,
  ImportsIcon,
  OrdersIcon,
  ProductsIcon,
  ReportsIcon,
  WarehousesIcon,
} from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { listOrders } from "@/lib/api/orders";
import { getLowStock } from "@/lib/api/reports";
import type { OrderStatus } from "@/lib/api/types";
import { PERMISSIONS, can, canAny } from "@/lib/auth/permissions";
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
      icon: <CategoriesIcon />,
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
      icon: <AttributesIcon />,
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
      icon: <BrandsIcon />,
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
      icon: <ProductsIcon />,
      allowed: canAny(session, [PERMISSIONS.productsRead, PERMISSIONS.productsCreate]),
    },
    {
      href: `/${lang}/admin/warehouses`,
      title: dict.admin.warehouses.title,
      body: dict.admin.warehouses.subtitle,
      icon: <WarehousesIcon />,
      allowed: canAny(session, [PERMISSIONS.warehousesManage]),
    },
    {
      href: `/${lang}/admin/orders`,
      title: dict.admin.orders.title,
      body: dict.admin.orders.subtitle,
      icon: <OrdersIcon />,
      allowed: canAny(session, [PERMISSIONS.ordersRead]),
    },
    {
      href: `/${lang}/admin/imports`,
      title: dict.admin.imports.title,
      body: dict.admin.imports.subtitle,
      icon: <ImportsIcon />,
      allowed: canAny(session, [PERMISSIONS.importsManage]),
    },
    {
      href: `/${lang}/admin/reports`,
      title: dict.admin.reports.title,
      body: dict.admin.reports.subtitle,
      icon: <ReportsIcon />,
      allowed: canAny(session, [PERMISSIONS.reportsView]),
    },
    {
      href: `/${lang}/admin/coupons`,
      title: dict.admin.coupons.title,
      body: dict.admin.coupons.subtitle,
      icon: <CouponsIcon />,
      allowed: canAny(session, [PERMISSIONS.promotionsManage]),
    },
    {
      href: `/${lang}/admin/customers`,
      title: dict.admin.customers.title,
      body: dict.admin.customers.subtitle,
      icon: <CustomersIcon />,
      allowed: canAny(session, [PERMISSIONS.pricesUpdate]),
    },
  ].filter((card) => card.allowed);

  // One filtered query per bucket, in parallel. `GET /orders` returns a page
  // rather than a total, so a full page plus a `nextCursor` is reported as
  // "100+" instead of pretending to know the exact figure.
  const canReadOrders = can(session, PERMISSIONS.ordersRead);
  const BUCKET_LIMIT = 100;

  const buckets: Array<{ label: string; status: OrderStatus }> = [
    { label: dict.admin.stats.awaitingPayment, status: "PENDING_PAYMENT" },
    { label: dict.admin.stats.toConfirm, status: "PAID" },
    { label: dict.admin.stats.toShip, status: "READY_TO_SHIP" },
  ];

  const orderBuckets = canReadOrders
    ? await Promise.all(
        buckets.map(async ({ label, status }) => {
          const page = await listOrders({ status, limit: BUCKET_LIMIT }).catch(
            () => null,
          );
          return {
            label,
            count: page?.items.length ?? 0,
            more: Boolean(page?.nextCursor),
            href: `/${lang}/admin/orders?status=${status}`,
          };
        }),
      )
    : [];

  // Stock alerts belong on the same shelf as the order buckets: both are
  // "something needs a person today".
  const lowStock = can(session, PERMISSIONS.reportsView)
    ? await getLowStock().catch(() => [])
    : [];

  const attention = [
    ...orderBuckets,
    {
      label: dict.admin.reports.lowStock,
      count: lowStock.length,
      more: false,
      href: `/${lang}/admin/reports/low-stock`,
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={dict.admin.title} subtitle={dict.admin.greetingSubtitle} />

      {canReadOrders ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">{dict.admin.stats.attention}</h2>
          {attention.length === 0 ? (
            <p className="text-muted text-sm">{dict.admin.stats.noAttention}</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {attention.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="border-border bg-surface/40 shadow-card hover:border-accent/40 hover:shadow-raised flex flex-col gap-1 rounded-2xl border p-5 transition"
                  >
                    <span className="text-accent text-3xl font-semibold">
                      {item.count}
                      {item.more ? "+" : ""}
                    </span>
                    <span className="text-muted text-sm">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="border-border bg-surface/40 shadow-card hover:border-accent/40 hover:shadow-raised flex flex-col gap-3 rounded-2xl border p-5 transition"
          >
            <span className="bg-accent/10 text-accent flex size-10 items-center justify-center rounded-xl">
              {card.icon}
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-medium">{card.title}</span>
              <span className="text-muted text-sm">{card.body}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
