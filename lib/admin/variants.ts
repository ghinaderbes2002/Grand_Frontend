"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { CACHE_TAGS } from "@/lib/api/cache";
import { apiFetch } from "@/lib/api/client";
import type {
  BulkPriceUpdateResult,
  Price,
  ProductVariant,
  Uuid,
  VariantStatus,
} from "@/lib/api/types";
import { requireSession } from "@/lib/auth/session";
import { describeApiError } from "@/lib/forms/api-error";
import {
  attributeValueFields,
  compact,
  number,
  text,
  PRICE_FIELD_PREFIX,
} from "@/lib/forms/fields";
import { errorState, fieldErrorState, type FormState } from "@/lib/forms/state";
import type { Locale } from "@/lib/i18n/config";
import { priceSchema, variantSchema } from "./schemas";

export async function createVariantAction(
  locale: Locale,
  productId: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = variantSchema.safeParse({
    sku: formData.get("sku"),
    barcode: text(formData, "barcode"),
    weight: number(formData, "weight"),
    attributeValues: attributeValueFields(formData),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<ProductVariant>(`/products/${productId}/variants`, {
      method: "POST",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    // 400 means a value failed its attribute's type check or an attribute was
    // missing — the API says which, so let that message through.
    return errorState(...describeApiError(error, { 409: "skuOrComboTaken" }));
  }

  updateTag(CACHE_TAGS.products);
  revalidatePath(`/${locale}/admin/products/${productId}`);
  return { status: "success" };
}

export async function setVariantStatusAction(
  locale: Locale,
  productId: Uuid,
  variantId: Uuid,
  status: VariantStatus,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<ProductVariant>(
      `/products/${productId}/variants/${variantId}/status`,
      { method: "PATCH", body: { status }, auth: true, cache: "no-store" },
    );
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  updateTag(CACHE_TAGS.products);
  revalidatePath(`/${locale}/admin/products/${productId}`);
  return { status: "success" };
}

export async function deleteVariantAction(
  locale: Locale,
  productId: Uuid,
  variantId: Uuid,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<void>(`/products/${productId}/variants/${variantId}`, {
      method: "DELETE",
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "lastVariant" }));
  }

  updateTag(CACHE_TAGS.products);
  revalidatePath(`/${locale}/admin/products/${productId}`);
  return { status: "success" };
}

/**
 * Prices several variants at once. Inputs are named `price__<variantId>`;
 * blanks are skipped so a partial fill leaves the rest untouched. The API runs
 * the whole set in one transaction.
 */
export async function setPricesBulkAction(
  locale: Locale,
  productId: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const priceListKey = text(formData, "priceListKey") ?? "retail";
  const updates: Array<{ variantId: Uuid; priceListKey: string; amount: number }> = [];

  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith(PRICE_FIELD_PREFIX) || typeof raw !== "string") continue;
    if (raw.trim() === "") continue;

    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      return fieldErrorState({ [key]: ["notPositive"] });
    }

    updates.push({
      variantId: key.slice(PRICE_FIELD_PREFIX.length),
      priceListKey,
      amount,
    });
  }

  if (updates.length === 0) {
    return fieldErrorState({ bulk: ["required"] });
  }

  try {
    await apiFetch<BulkPriceUpdateResult>("/prices/bulk", {
      method: "POST",
      body: { updates },
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  updateTag(CACHE_TAGS.products);
  revalidatePath(`/${locale}/admin/products/${productId}`);
  return { status: "success" };
}

/** Upsert: creates the price or updates it if the variant/list pair exists. */
export async function setPriceAction(
  locale: Locale,
  productId: Uuid,
  variantId: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = priceSchema.safeParse({
    priceListKey: formData.get("priceListKey"),
    amount: number(formData, "amount"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<Price>(`/variants/${variantId}/prices`, {
      method: "POST",
      body: parsed.data,
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  updateTag(CACHE_TAGS.products);
  revalidatePath(`/${locale}/admin/products/${productId}`);
  return { status: "success" };
}
