import Link from "next/link";
import { notFound } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
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

  const { status } = await searchParams;
  const selected =
    typeof status === "string" && ORDER_STATUSES.includes(status as OrderStatus)
      ? (status as OrderStatus)
      : undefined;

  const all = await listOrders();

  // `GET /orders` documents no query parameters, so this filters what came
  // back rather than narrowing the request. Fine for now, but the endpoint
  // needs status filtering and pagination before this list grows.
  const orders = selected ? all.filter((order) => order.status === selected) : all;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{dict.admin.orders.title}</h2>
        <p className="text-muted max-w-2xl text-sm">{dict.admin.orders.subtitle}</p>
      </header>

      <p className="border-border bg-surface/40 text-muted rounded-lg border px-3 py-2 text-sm">
        {dict.admin.orders.paymentTimeout}
      </p>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          {dict.admin.filters.status}
          <select
            name="status"
            defaultValue={selected ?? ""}
            className="border-border bg-background h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">{dict.admin.filters.allStatuses}</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {dict.admin.orders.statuses[value]}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit" className="h-10">
          {dict.admin.filters.apply}
        </Button>
        {selected ? (
          <Link href={`/${lang}/admin/orders`}>
            <Button type="button" variant="ghost" className="h-10">
              {dict.admin.filters.clear}
            </Button>
          </Link>
        ) : null}

        <span className="text-muted ms-auto text-xs">
          {dict.admin.filters.showing}: {orders.length} / {all.length}
          <br />
          {dict.admin.filters.clientFiltered}
        </span>
      </form>

      {orders.length === 0 ? (
        <p className="text-muted text-sm">{dict.admin.empty}</p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
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
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-muted px-3 py-2 text-start text-xs font-medium">{children}</th>;
}
