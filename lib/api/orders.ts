import "server-only";

import { apiFetch } from "./client";
import type {
  Cart,
  CursorPage,
  Order,
  OrderListQuery,
  Shipment,
  Uuid,
} from "./types";

const fresh = { cache: "no-store", auth: true } as const;

// --- cart ------------------------------------------------------------------

/** Each user has exactly one server-side cart, keyed to their account. */
export function getCart() {
  return apiFetch<Cart>("/cart", fresh);
}

// --- orders ----------------------------------------------------------------

/** The signed-in customer's own orders. */
export function listMyOrders() {
  return apiFetch<Order[]>("/orders/my", fresh);
}

/**
 * Every order — requires `orders.read`. Filtered and paginated server-side,
 * the same cursor pattern the product listing uses.
 */
export function listOrders(query: OrderListQuery = {}) {
  return apiFetch<CursorPage<Order>>("/orders", { ...fresh, query });
}

/**
 * A customer sees only their own; anyone else's returns 404 rather than 403,
 * so the response never reveals that the order exists.
 *
 * The response embeds `items`, `payments`, `shipments` and `statusHistory`, so
 * a refund id or a tracking number is already here — no follow-up call.
 */
export function getOrder(id: Uuid) {
  return apiFetch<Order>(`/orders/${id}`, fresh);
}

/**
 * Still available, but `getOrder` already embeds shipments — reach for this
 * only when you have no order in hand.
 */
export function listShipments(orderId: Uuid) {
  return apiFetch<Shipment[]>(`/orders/${orderId}/shipments`, fresh);
}
