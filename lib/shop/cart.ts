"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import type { Cart, Order, Uuid } from "@/lib/api/types";
import { requireSession } from "@/lib/auth/session";
import { cartItemSchema, cartQuantitySchema, shippingAddressSchema } from "@/lib/admin/schemas";
import { describeApiError } from "@/lib/forms/api-error";
import { number } from "@/lib/forms/fields";
import { errorState, fieldErrorState, type FormState } from "@/lib/forms/state";
import type { Locale } from "@/lib/i18n/config";

/**
 * Cart and checkout, all tied to the signed-in user's server-side cart.
 *
 * The order endpoint takes no line items: it builds the order from that cart,
 * which is why every mutation here revalidates rather than tracking state
 * client-side.
 */

export async function addToCartAction(
  locale: Locale,
  variantId: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = cartItemSchema.safeParse({
    variantId,
    quantity: number(formData, "quantity"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    // Note: the API *adds* to any existing quantity rather than replacing it.
    await apiFetch<Cart>("/cart/items", {
      method: "POST",
      body: parsed.data,
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    // 400 covers both a fractional quantity on a whole-unit product and falling
    // below the minimum order, and the API says which.
    return errorState(...describeApiError(error));
  }

  revalidatePath(`/${locale}/cart`);
  return { status: "success" };
}

export async function updateCartItemAction(
  locale: Locale,
  itemId: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = cartQuantitySchema.safeParse({
    quantity: number(formData, "quantity"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    // Unlike adding, this replaces the quantity outright; zero removes the item.
    await apiFetch<Cart>(`/cart/items/${itemId}`, {
      method: "PATCH",
      body: parsed.data,
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  revalidatePath(`/${locale}/cart`);
  return { status: "success" };
}

export async function removeCartItemAction(
  locale: Locale,
  itemId: Uuid,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<void>(`/cart/items/${itemId}`, {
      method: "DELETE",
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  revalidatePath(`/${locale}/cart`);
  return { status: "success" };
}

export async function clearCartAction(
  locale: Locale,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<void>("/cart", { method: "DELETE", auth: true, cache: "no-store" });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  revalidatePath(`/${locale}/cart`);
  return { status: "success" };
}

export async function placeOrderAction(
  locale: Locale,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = shippingAddressSchema.safeParse({
    city: formData.get("city"),
    street: formData.get("street"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  let order: Order;
  try {
    order = await apiFetch<Order>("/orders", {
      method: "POST",
      body: { shippingAddress: parsed.data },
      auth: true,
      cache: "no-store",
      // Survives a double submit or a retried request after a dropped connection.
      idempotencyKey: crypto.randomUUID(),
    });
  } catch (error) {
    // 409 is the overselling guard: stock ran out between browsing and checkout.
    return errorState(...describeApiError(error, { 409: "insufficientStock" }));
  }

  // The API empties the cart itself, but only on success.
  revalidatePath(`/${locale}/cart`);
  revalidatePath(`/${locale}/orders`);
  redirect(`/${locale}/orders/${order.id}`);
}

/**
 * Cancels the customer's own order.
 *
 * The contract is self-contradictory here: `PATCH /orders/:id/status` is
 * documented as requiring `orders.updateStatus`, while note 11 tells the
 * frontend to use that exact call to cancel — and a `customer` holds no
 * permissions. Compare `POST /orders/:id/pay`, which grants access to the order
 * owner explicitly; nothing similar is said for this one.
 *
 * The button is kept, since removing it would break the flow if the backend
 * does allow owners. A 403 is mapped to its own message rather than the generic
 * error, so the cause is legible if the other reading turns out to be right.
 */
export async function cancelOrderAction(
  locale: Locale,
  orderId: Uuid,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<Order>(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: { status: "CANCELLED" },
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(
      ...describeApiError(error, {
        409: "invalidTransition",
        403: "cancelNotPermitted",
      }),
    );
  }

  revalidatePath(`/${locale}/orders/${orderId}`);
  revalidatePath(`/${locale}/orders`);
  return { status: "success" };
}
