"use client";

import type { OrderStatus } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/context";

/** Groups the thirteen statuses into three visual tones. */
const TONE: Record<OrderStatus, "neutral" | "good" | "bad"> = {
  DRAFT: "neutral",
  PENDING_PAYMENT: "neutral",
  PAID: "good",
  CONFIRMED: "good",
  PROCESSING: "neutral",
  READY_TO_SHIP: "neutral",
  SHIPPED: "good",
  DELIVERED: "good",
  CANCELLED: "bad",
  PAYMENT_FAILED: "bad",
  RETURN_REQUESTED: "neutral",
  RETURNED: "bad",
  REFUNDED: "bad",
};

const CLASSES = {
  neutral: "border-border text-muted",
  good: "border-success/40 text-success",
  bad: "border-danger/40 text-danger",
} as const;

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { dict } = useI18n();

  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-xs whitespace-nowrap ${CLASSES[TONE[status]]}`}
    >
      {dict.admin.orders.statuses[status]}
    </span>
  );
}
