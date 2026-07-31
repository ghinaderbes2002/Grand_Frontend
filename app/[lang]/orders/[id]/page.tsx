import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { OrderItemsTable } from "@/components/orders/order-items-table";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { PayButton } from "@/components/shop/pay-button";
import { ApiError } from "@/lib/api/errors";
import { getOrder } from "@/lib/api/orders";
import { requireSession } from "@/lib/auth/session";
import { cancelOrderAction } from "@/lib/shop/cart";
import { formatAmount, formatDateTime, shortId } from "@/lib/format";
import { awaitingPayment, customerCanCancel } from "@/lib/orders/transitions";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function MyOrderPage({ params }: PageProps<"/[lang]/orders/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  await requireSession(lang, `/${lang}/orders/${id}`);

  // Someone else's order returns 404, not 403 — the API declines to confirm
  // that it exists at all, and this page passes that through unchanged.
  const order = await getOrder(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Link
        href={`/${lang}/orders`}
        className="text-muted hover:text-foreground text-sm"
      >
        ← {dict.admin.orders.myOrders}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-xl font-semibold">{shortId(order.id)}</h1>
        <OrderStatusBadge status={order.status} />
        <span className="text-muted text-sm">
          {formatDateTime(order.createdAt, lang)}
        </span>
      </div>

      {awaitingPayment(order.status) ? (
        <div className="border-border rounded-xl border p-5">
          <h2 className="mb-3 font-medium">{dict.admin.payments.title}</h2>
          <p className="text-muted mb-3 text-xs">{dict.admin.orders.paymentTimeout}</p>
          <PayButton orderId={order.id} path={`/${lang}/orders/${order.id}`} />
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="font-medium">{dict.admin.orders.items}</h2>
        <OrderItemsTable items={order.items} locale={lang} />
        <p className="text-end text-sm">
          <span className="text-muted">{dict.admin.orders.total}: </span>
          <span className="font-semibold">{formatAmount(order.total, lang)}</span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">{dict.admin.orders.shippingAddress}</h2>
        <address className="border-border rounded-lg border p-3 text-sm not-italic">
          {Object.entries(order.shippingAddress).map(([key, value]) => (
            <span key={key} className="block">
              <span className="text-muted">{key}: </span>
              {value}
            </span>
          ))}
        </address>
      </div>

      {customerCanCancel(order.status) ? (
        <div className="border-border border-t pt-4">
          <ConfirmButton
            action={cancelOrderAction.bind(null, lang, order.id)}
            label={dict.admin.orders.cancel}
            pendingLabel={dict.admin.actions.saving}
          />
        </div>
      ) : null}
    </div>
  );
}
