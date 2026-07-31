import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { listMyOrders } from "@/lib/api/orders";
import { requireSession } from "@/lib/auth/session";
import { formatAmount, formatDateTime, shortId } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function MyOrdersPage({ params }: PageProps<"/[lang]/orders">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  await requireSession(lang, `/${lang}/orders`);

  const orders = await listMyOrders();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">{dict.admin.orders.myOrders}</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-muted text-sm">{dict.admin.orders.noOrders}</p>
          <Link href={`/${lang}/shop`}>
            <Button>{dict.shop.title}</Button>
          </Link>
        </div>
      ) : (
        <ul className="border-border divide-border divide-y rounded-xl border">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/${lang}/orders/${order.id}`}
                className="hover:bg-surface flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition"
              >
                <span className="flex flex-col gap-1">
                  <span className="font-mono text-xs">{shortId(order.id)}</span>
                  <span className="text-muted text-xs">
                    {formatDateTime(order.createdAt, lang)}
                  </span>
                </span>
                <OrderStatusBadge status={order.status} />
                <span className="text-sm font-medium">
                  {formatAmount(order.total, lang)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
