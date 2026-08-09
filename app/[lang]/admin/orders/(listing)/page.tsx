import Link from "next/link";
import { notFound } from "next/navigation";

import { Th } from "@/components/admin/data-table";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control";
import { ORDER_STATUSES } from "@/lib/admin/schemas";
import { listOrders } from "@/lib/api/orders";
import type { OrderStatus } from "@/lib/api/types";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { formatAmount, formatDateTime, shortId } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function OrdersPage({
  params,
  searchParams,
}: PageProps<"/[lang]/admin/orders">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/orders`);

  if (!can(session, PERMISSIONS.ordersRead)) {
    return <NoAccess locale={lang} />;
  }

  const { status, cursor } = await searchParams;
  const selected =
    typeof status === "string" && ORDER_STATUSES.includes(status as OrderStatus)
      ? (status as OrderStatus)
      : undefined;

  // Filtered and paginated by the API, not after the fact.
  const page = await listOrders({
    status: selected,
    cursor: typeof cursor === "string" ? cursor : undefined,
    limit: 30,
  });
  const orders = page.items;

  const nextParams = new URLSearchParams();
  if (selected) nextParams.set("status", selected);
  if (page.nextCursor) nextParams.set("cursor", page.nextCursor);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={dict.admin.orders.title} subtitle={dict.admin.orders.subtitle} />

      <p className="border-border bg-surface/40 text-muted rounded-2xl border px-4 py-2.5 text-sm">
        {dict.admin.orders.paymentTimeout}
      </p>

      <form
        method="get"
        className="border-border bg-surface/40 flex flex-wrap items-end gap-3 rounded-2xl border p-4"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          {dict.admin.filters.status}
          <select
            name="status"
            defaultValue={selected ?? ""}
            className={controlClass()}
          >
            <option value="">{dict.admin.filters.allStatuses}</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {dict.admin.orders.statuses[value]}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit">
          {dict.admin.filters.apply}
        </Button>
        {selected ? (
          <Link href={`/${lang}/admin/orders`}>
            <Button type="button" variant="ghost">
              {dict.admin.filters.clear}
            </Button>
          </Link>
        ) : null}

      </form>

      {orders.length === 0 ? (
        <p className="text-muted text-sm">{dict.admin.empty}</p>
      ) : (
        <div className="border-border overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="border-border bg-surface/60 border-b">
              <tr>
                <Th>{dict.admin.orders.orderNumber}</Th>
                <Th>{dict.admin.orders.status}</Th>
                <Th>{dict.admin.orders.total}</Th>
                <Th>{dict.admin.orders.createdAt}</Th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-surface transition">
                  <td className="px-3 py-2">
                    <Link
                      href={`/${lang}/admin/orders/${order.id}`}
                      className="font-mono text-xs hover:underline"
                    >
                      {shortId(order.id)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-3 py-2">{formatAmount(order.total, lang)}</td>
                  <td className="text-muted px-3 py-2 text-xs">
                    {formatDateTime(order.createdAt, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {page.nextCursor ? (
        <Link
          href={`/${lang}/admin/orders?${nextParams.toString()}`}
          className="self-center"
        >
          <Button variant="ghost">{dict.admin.filters.loadMore}</Button>
        </Link>
      ) : null}
    </div>
  );
}
