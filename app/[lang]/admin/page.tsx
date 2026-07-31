import Link from "next/link";
import { notFound } from "next/navigation";

import { listOrders } from "@/lib/api/orders";
import { listProducts } from "@/lib/api/products";
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

  // Counts come from the endpoints the role can already reach, so the overview
  // never causes a 403. Orders are counted client-side because `GET /orders`
  // takes no filter parameters.
  const canReadOrders = can(session, PERMISSIONS.ordersRead);
  const [orders, products] = await Promise.all([
    canReadOrders ? listOrders().catch(() => []) : Promise.resolve([]),
    listProducts({ limit: 1 }).catch(() => null),
  ]);

  const attention = [
    {
      label: dict.admin.stats.awaitingPayment,
      count: orders.filter((order) => order.status === "PENDING_PAYMENT").length,
      href: `/${lang}/admin/orders?status=PENDING_PAYMENT`,
    },
    {
      label: dict.admin.stats.toConfirm,
      count: orders.filter((order) => order.status === "PAID").length,
      href: `/${lang}/admin/orders?status=PAID`,
    },
    {
      label: dict.admin.stats.toShip,
      count: orders.filter((order) => order.status === "READY_TO_SHIP").length,
      href: `/${lang}/admin/orders?status=READY_TO_SHIP`,
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="flex flex-col gap-8">
      {canReadOrders ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">{dict.admin.stats.attention}</h2>
          {attention.length === 0 ? (
            <p className="text-muted text-sm">{dict.admin.stats.noAttention}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-3">
              {attention.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="border-border hover:bg-surface flex flex-col gap-1 rounded-xl border p-4 transition"
                  >
                    <span className="text-accent text-2xl font-semibold">
                      {item.count}
                    </span>
                    <span className="text-muted text-sm">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <dl className="text-muted flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex gap-1.5">
              <dt>{dict.admin.stats.totalOrders}:</dt>
              <dd className="text-foreground font-medium">{orders.length}</dd>
            </div>
            {products ? (
              <div className="flex gap-1.5">
                <dt>{dict.admin.stats.publishedProducts}:</dt>
                {/* The listing is cursor-paginated with no total, so this only
                    reports whether the catalogue has anything published. */}
                <dd className="text-foreground font-medium">
                  {products.items.length > 0 ? "✓" : "—"}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

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
    </div>
  );
}
