import { notFound } from "next/navigation";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { NoAccess } from "@/components/admin/no-access";
import {
  OrderStatusForm,
  RefundForm,
  ShipmentForm,
} from "@/components/admin/order-forms";
import { PageHeader } from "@/components/admin/page-header";
import { OrderItemsTable } from "@/components/orders/order-items-table";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { deliverShipmentAction } from "@/lib/admin/orders";
import { ApiError } from "@/lib/api/errors";
import { getOrder } from "@/lib/api/orders";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { formatAmount, formatDateTime, shortId } from "@/lib/format";
import { allowedTransitions } from "@/lib/orders/transitions";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function OrderDetailPage({
  params,
}: PageProps<"/[lang]/admin/orders/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/orders/${id}`);

  if (!can(session, PERMISSIONS.ordersRead)) {
    return <NoAccess locale={lang} />;
  }

  const order = await getOrder(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  });

  const canUpdateStatus = can(session, PERMISSIONS.ordersUpdateStatus);

  // Embedded in the order response — no separate call, and no permission wall
  // in front of reading them.
  const shipments = order.shipments ?? [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: `/${lang}/admin/orders`, label: dict.admin.orders.title }}
        title={shortId(order.id)}
        subtitle={formatDateTime(order.createdAt, lang)}
        action={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="font-medium">{dict.admin.orders.items}</h3>
            <OrderItemsTable items={order.items} locale={lang} />
            <p className="text-end text-sm">
              <span className="text-muted">{dict.admin.orders.total}: </span>
              <span className="font-semibold">{formatAmount(order.total, lang)}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-medium">{dict.admin.orders.shippingAddress}</h3>
            <address className="border-border rounded-lg border p-3 text-sm not-italic">
              {Object.entries(order.shippingAddress).map(([key, value]) => (
                <span key={key} className="block">
                  <span className="text-muted">{key}: </span>
                  {value}
                </span>
              ))}
            </address>
          </div>

          {can(session, PERMISSIONS.ordersRefund) ? (
            <div className="flex flex-col gap-3">
              <h3 className="font-medium">{dict.admin.payments.title}</h3>
              <p className="text-muted text-xs">{dict.admin.payments.mockNotice}</p>
              {order.payments?.length ? (
                order.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="border-border flex flex-col gap-3 rounded-lg border p-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-mono text-xs">{shortId(payment.id)}</span>
                      <span>{formatAmount(payment.amount, lang)}</span>
                      <span className="text-muted text-xs">
                        {dict.admin.payments.statuses[payment.status]}
                      </span>
                    </div>
                    {payment.status === "SUCCEEDED" ? (
                      <RefundForm paymentId={payment.id} orderId={order.id} />
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-muted text-sm">{dict.admin.payments.noPayments}</p>
              )}
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-6">
          {canUpdateStatus ? (
            <div className="border-border rounded-xl border p-5">
              <h3 className="mb-1 font-medium">{dict.admin.orders.changeStatus}</h3>
              <p className="text-muted mb-4 text-xs">{dict.admin.orders.stockNote}</p>
              <OrderStatusForm
                orderId={order.id}
                options={allowedTransitions(order.status)}
              />
            </div>
          ) : null}

          {canUpdateStatus ? (
            <div className="border-border rounded-xl border p-5">
              <h3 className="mb-4 font-medium">{dict.admin.shipments.title}</h3>

              {shipments.length === 0 ? (
                <p className="text-muted mb-4 text-sm">
                  {dict.admin.shipments.noShipments}
                </p>
              ) : (
                <ul className="mb-4 flex flex-col gap-3">
                  {shipments.map((shipment) => (
                    <li
                      key={shipment.id}
                      className="border-border flex flex-col gap-2 rounded-lg border p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span>{shipment.carrier}</span>
                        <span className="text-muted font-mono text-xs">
                          {shipment.trackingNumber}
                        </span>
                      </div>
                      <span className="text-muted text-xs">
                        {dict.admin.shipments.statuses[shipment.status]}
                      </span>
                      {shipment.status !== "DELIVERED" ? (
                        <ConfirmButton
                          action={deliverShipmentAction.bind(
                            null,
                            lang,
                            shipment.id,
                            order.id,
                          )}
                          label={dict.admin.shipments.deliver}
                          pendingLabel={dict.admin.actions.saving}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              {order.status === "READY_TO_SHIP" ? (
                <ShipmentForm orderId={order.id} />
              ) : (
                <p className="text-muted text-xs">{dict.admin.shipments.createHint}</p>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
