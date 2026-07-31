"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import type { Order, Payment, Shipment, Uuid } from "@/lib/api/types";
import { requireSession } from "@/lib/auth/session";
import { describeApiError } from "@/lib/forms/api-error";
import { compact, number, text } from "@/lib/forms/fields";
import { errorState, fieldErrorState, type FormState } from "@/lib/forms/state";
import type { Locale } from "@/lib/i18n/config";
import { orderStatusSchema, refundSchema, shipmentSchema } from "./schemas";

/**
 * Order, payment and shipment mutations.
 *
 * Status changes are where the stock rules live: confirming deducts stock for
 * real, cancelling before that releases the reservation, and the API rejects
 * any transition the state machine does not allow with a 409.
 */

export async function updateOrderStatusAction(
  locale: Locale,
  orderId: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = orderStatusSchema.safeParse({
    status: formData.get("status"),
    reason: text(formData, "reason"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<Order>(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "invalidTransition" }));
  }

  revalidatePath(`/${locale}/admin/orders/${orderId}`);
  revalidatePath(`/${locale}/admin/orders`);
  return { status: "success" };
}

/**
 * The provider is a mock for now: it always succeeds unless failure is asked
 * for explicitly. Success moves the order to PAID by itself.
 */
export async function payOrderAction(
  locale: Locale,
  orderId: Uuid,
  simulateFailure: boolean,
  redirectPath: string,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<Payment>(`/orders/${orderId}/pay`, {
      method: "POST",
      body: { simulateFailure },
      auth: true,
      cache: "no-store",
      // Guards against a double click or a retried request creating two payments.
      idempotencyKey: `pay-${orderId}`,
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "invalidTransition" }));
  }

  revalidatePath(redirectPath);
  return { status: "success" };
}

export async function refundPaymentAction(
  locale: Locale,
  paymentId: Uuid,
  orderId: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = refundSchema.safeParse({
    amount: number(formData, "amount"),
    reason: text(formData, "reason"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<Payment>(`/payments/${paymentId}/refund`, {
      method: "POST",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "refundTooLarge" }));
  }

  revalidatePath(`/${locale}/admin/orders/${orderId}`);
  return { status: "success" };
}

/** Requires the order to be READY_TO_SHIP; moves it to SHIPPED on success. */
export async function createShipmentAction(
  locale: Locale,
  orderId: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = shipmentSchema.safeParse({
    carrier: formData.get("carrier"),
    trackingNumber: formData.get("trackingNumber"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<Shipment>(`/orders/${orderId}/shipments`, {
      method: "POST",
      body: parsed.data,
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "invalidTransition" }));
  }

  revalidatePath(`/${locale}/admin/orders/${orderId}`);
  return { status: "success" };
}

/** Also moves the order to DELIVERED. */
export async function deliverShipmentAction(
  locale: Locale,
  shipmentId: Uuid,
  orderId: Uuid,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<Shipment>(`/shipments/${shipmentId}/deliver`, {
      method: "POST",
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "invalidTransition" }));
  }

  revalidatePath(`/${locale}/admin/orders/${orderId}`);
  return { status: "success" };
}
