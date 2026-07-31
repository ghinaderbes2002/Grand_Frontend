import "server-only";

import { apiFetch } from "./client";
import type { Cart, Order, Shipment, Uuid } from "./types";

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

/** Every order — requires `orders.read`. */
export function listOrders() {
  return apiFetch<Order[]>("/orders", fresh);
}

/**
 * A customer sees only their own; anyone else's returns 404 rather than 403,
 * so the response never reveals that the order exists.
 */
export function getOrder(id: Uuid) {
  return apiFetch<Order>(`/orders/${id}`, fresh);
}

// --- payments & shipments --------------------------------------------------

export function listShipments(orderId: Uuid) {
  return apiFetch<Shipment[]>(`/orders/${orderId}/shipments`, fresh);
}
