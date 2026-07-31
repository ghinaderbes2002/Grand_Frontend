import type { OrderStatus } from "@/lib/api/types";

/**
 * The transitions the UI offers, derived from the flow documented in
 * API_CONTRACT.md:
 *
 *   DRAFT → PENDING_PAYMENT → PAID → CONFIRMED → PROCESSING
 *         → READY_TO_SHIP → SHIPPED → DELIVERED
 *
 * plus the exceptional branches (cancellation, payment failure, returns).
 *
 * This is a **convenience, not a rule**: the API owns the state machine and
 * rejects anything it disallows with a 409 whose message the UI shows verbatim.
 * If the backend permits an edge missing here, add it — nothing breaks either
 * way, the option simply is not offered.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PENDING_PAYMENT", "CANCELLED"],
  PENDING_PAYMENT: ["PAID", "PAYMENT_FAILED", "CANCELLED"],
  // The contract calls out retrying a failed payment by returning here.
  PAYMENT_FAILED: ["PENDING_PAYMENT", "CANCELLED"],
  PAID: ["CONFIRMED", "CANCELLED"],
  // Stock leaves `quantityOnHand` for good at CONFIRMED.
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY_TO_SHIP", "CANCELLED"],
  // Creating a shipment moves this to SHIPPED on its own.
  READY_TO_SHIP: ["SHIPPED"],
  // Marking a shipment delivered moves this to DELIVERED on its own.
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURNED"],
  RETURNED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function allowedTransitions(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

/** Statuses a customer may cancel from, per the contract's note on cancelling. */
const CUSTOMER_CANCELLABLE: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "PROCESSING",
];

export function customerCanCancel(status: OrderStatus) {
  return CUSTOMER_CANCELLABLE.includes(status);
}

/** Whether the customer still needs to pay. */
export function awaitingPayment(status: OrderStatus) {
  return status === "PENDING_PAYMENT" || status === "PAYMENT_FAILED";
}
