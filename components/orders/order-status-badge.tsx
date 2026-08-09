"use client";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/context";

/**
 * Groups the thirteen statuses into visual tones. `warning` marks the two that
 * are waiting on somebody — they read differently from a step that is simply
 * in progress.
 */
const TONE: Record<OrderStatus, BadgeTone> = {
  DRAFT: "neutral",
  PENDING_PAYMENT: "warning",
  PAID: "success",
  CONFIRMED: "success",
  PROCESSING: "neutral",
  READY_TO_SHIP: "neutral",
  SHIPPED: "success",
  DELIVERED: "success",
  CANCELLED: "danger",
  PAYMENT_FAILED: "danger",
  RETURN_REQUESTED: "warning",
  RETURNED: "danger",
  REFUNDED: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { dict } = useI18n();

  return <Badge tone={TONE[status]}>{dict.admin.orders.statuses[status]}</Badge>;
}
