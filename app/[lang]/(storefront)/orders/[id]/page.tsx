import { notFound } from "next/navigation";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { OrderItemsTable } from "@/components/orders/order-items-table";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { PageShell, Panel, ShopPageHeader } from "@/components/shop/page-shell";
import { PayButton } from "@/components/shop/pay-button";
import { ApiError } from "@/lib/api/errors";
import { getOrder } from "@/lib/api/orders";
import { requireSession } from "@/lib/auth/session";
import { cancelOrderAction } from "@/lib/shop/cart";
import { ORDERING_ENABLED } from "@/lib/shop/ordering";
import { formatAmount, formatDateTime, shortId } from "@/lib/format";
import { awaitingPayment, customerCanCancel } from "@/lib/orders/transitions";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function MyOrderPage({ params }: PageProps<"/[lang]/orders/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  // Ordering is suspended: the route stops existing rather than asking for
  // a login it no longer has any use for.
  if (!ORDERING_ENABLED) notFound();

  const dict = getDictionary(lang);
  await requireSession(lang, `/${lang}/orders/${id}`);

  // Someone else's order returns 404, not 403 — the API declines to confirm
  // that it exists at all, and this page passes that through unchanged.
  const order = await getOrder(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  });

  return (
    <PageShell width="narrow">
      <ShopPageHeader
        back={{ href: `/${lang}/orders`, label: dict.admin.orders.myOrders }}
        title={shortId(order.id)}
        subtitle={formatDateTime(order.createdAt, lang)}
        action={<OrderStatusBadge status={order.status} />}
      />

      {awaitingPayment(order.status) ? (
        <Panel>
          <h2 className="mb-3 font-medium">{dict.admin.payments.title}</h2>
          <p className="text-muted mb-3 text-xs">{dict.admin.orders.paymentTimeout}</p>
          <PayButton orderId={order.id} path={`/${lang}/orders/${order.id}`} />
        </Panel>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="font-medium">{dict.admin.orders.items}</h2>
        <OrderItemsTable items={order.items} locale={lang} />
        <p className="text-end text-sm">
          <span className="text-muted">{dict.admin.orders.total}: </span>
          <span className="font-semibold">{formatAmount(order.total, lang)}</span>
        </p>
      </div>

      {/* Shipments are embedded in the order, so the customer can finally see
          their own carrier and tracking number — the dedicated endpoint is
          behind `orders.updateStatus`, which they do not have. */}
      {order.shipments?.length ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-medium">{dict.admin.shipments.title}</h2>
          <ul className="flex flex-col gap-2">
            {order.shipments.map((shipment) => (
              <li
                key={shipment.id}
                className="border-border flex flex-wrap items-baseline justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <span>{shipment.carrier}</span>
                <span className="font-mono text-xs">{shipment.trackingNumber}</span>
                <span className="text-muted text-xs">
                  {dict.admin.shipments.statuses[shipment.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
    </PageShell>
  );
}
