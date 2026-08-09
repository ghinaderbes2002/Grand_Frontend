"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import type { Cart, CouponValidation, Order, Uuid } from "@/lib/api/types";
import { couponDiscount } from "@/lib/api/types";
import { requireSession } from "@/lib/auth/session";
import { cartItemSchema, cartQuantitySchema, shippingAddressSchema } from "@/lib/admin/schemas";
import { describeApiError } from "@/lib/forms/api-error";
import { compact, number, text } from "@/lib/forms/fields";
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

  // "layout" so the storefront shell re-renders too — the header carries the
  // cart count, and revalidating only `/cart` leaves it stale on the page the
  // customer is actually standing on.
  revalidatePath(`/${locale}`, "layout");
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

  // "layout" so the storefront shell re-renders too — the header carries the
  // cart count, and revalidating only `/cart` leaves it stale on the page the
  // customer is actually standing on.
  revalidatePath(`/${locale}`, "layout");
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

  // "layout" so the storefront shell re-renders too — the header carries the
  // cart count, and revalidating only `/cart` leaves it stale on the page the
  // customer is actually standing on.
  revalidatePath(`/${locale}`, "layout");
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

  // "layout" so the storefront shell re-renders too — the header carries the
  // cart count, and revalidating only `/cart` leaves it stale on the page the
  // customer is actually standing on.
  revalidatePath(`/${locale}`, "layout");
  return { status: "success" };
}

export type CouponPreview =
  | { ok: true; discountAmount: number }
  | { ok: false; state: FormState };

/**
 * Checks a code and reports the discount it would give, **without consuming
 * it** — the real consumption happens atomically when the order is created.
 *
 * Requires a session on purpose: a public validate endpoint would let anyone
 * brute-force discover codes.
 */
export async function previewCouponAction(
  locale: Locale,
  code: string,
  subtotal: number,
): Promise<CouponPreview> {
  await requireSession(locale);

  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { ok: false, state: errorState("required") };

  try {
    const result = await apiFetch<CouponValidation>("/coupons/validate", {
      method: "POST",
      body: { code: trimmed, subtotal },
      auth: true,
      cache: "no-store",
    });

    if (result.valid === false) {
      return { ok: false, state: errorState("couponUnavailable") };
    }

    // The response shape is not pinned down, so fall back to computing the
    // discount from the coupon itself when the API does not return one.
    const discountAmount =
      result.discountAmount ??
      (result.coupon ? couponDiscount(result.coupon, subtotal) : null);

    if (discountAmount === null) {
      return { ok: false, state: errorState("couponUnavailable") };
    }

    return { ok: true, discountAmount };
  } catch (error) {
    return {
      ok: false,
      state: errorState(
        ...describeApiError(error, { 404: "couponUnavailable", 409: "couponUnavailable" }),
      ),
    };
  }
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

  const couponCode = text(formData, "couponCode")?.toUpperCase();

  let order: Order;
  try {
    order = await apiFetch<Order>("/orders", {
      method: "POST",
      body: compact({ shippingAddress: parsed.data, couponCode }),
      auth: true,
      cache: "no-store",
      // Survives a double submit or a retried request after a dropped connection.
      idempotencyKey: crypto.randomUUID(),
    });
  } catch (error) {
    // 409 covers two races here: stock running out between browsing and
    // checkout, and a coupon hitting its limit at the same moment. The API's
    // own message distinguishes them, so it is shown rather than guessed at.
    return errorState(...describeApiError(error, { 409: "insufficientStock" }));
  }

  // The API empties the cart itself, but only on success.
  // "layout" so the storefront shell re-renders too — the header carries the
  // cart count, and revalidating only `/cart` leaves it stale on the page the
  // customer is actually standing on.
  revalidatePath(`/${locale}`, "layout");
  revalidatePath(`/${locale}/orders`);
  redirect(`/${locale}/orders/${order.id}`);
}

/**
 * Cancels the customer's own order.
 *
 * The owner may drive this one transition without any permission; every other
 * target status returns 403 for them, and a non-owner without
 * `orders.updateStatus` gets 404 rather than 403 — the API declines to confirm
 * that someone else's order exists.
 *
 * Since this only ever sends `CANCELLED`, the 403 mapping below should not
 * trigger in practice; it is kept so the cause stays legible if it ever does.
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
