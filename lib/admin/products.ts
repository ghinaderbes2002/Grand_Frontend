"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { CACHE_TAGS } from "@/lib/api/cache";
import { apiFetch } from "@/lib/api/client";
import type { Product, Uuid } from "@/lib/api/types";
import { requireSession } from "@/lib/auth/session";
import { describeApiError } from "@/lib/forms/api-error";
import { attributeValueFields, compact, number, text } from "@/lib/forms/fields";
import { errorState, fieldErrorState, type FormState } from "@/lib/forms/state";
import type { Locale } from "@/lib/i18n/config";
import { productSchema, productUpdateSchema } from "./schemas";

export async function createProductAction(
  locale: Locale,
  categoryId: Uuid,
  /** Derived from the category's attributes, not chosen by the user. */
  type: "SIMPLE" | "VARIABLE",
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = productSchema.safeParse({
    categoryId,
    type,
    brandId: text(formData, "brandId"),
    name: formData.get("name"),
    slug: text(formData, "slug"),
    description: text(formData, "description"),
    sellingUnit: formData.get("sellingUnit"),
    minOrderQuantity: number(formData, "minOrderQuantity"),
    attributeValues: attributeValueFields(formData),
    // Only a simple product carries these; its single implicit variant needs them.
    sku: type === "SIMPLE" ? text(formData, "sku") : undefined,
    barcode: type === "SIMPLE" ? text(formData, "barcode") : undefined,
    weight: type === "SIMPLE" ? number(formData, "weight") : undefined,
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  let created: Product;
  try {
    created = await apiFetch<Product>("/products", {
      method: "POST",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    // 400 here is usually a rejected attribute value; the API names the field,
    // so its message is more useful than anything we could map it to.
    return errorState(...describeApiError(error, { 409: "slugOrSkuTaken" }));
  }

  updateTag(CACHE_TAGS.products);
  revalidatePath(`/${locale}/admin/products`, "layout");
  redirect(`/${locale}/admin/products/${created.id}`);
}

export async function updateProductAction(
  locale: Locale,
  id: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  // categoryId and type are deliberately absent — the API rejects changing them.
  const parsed = productUpdateSchema.safeParse({
    name: formData.get("name"),
    slug: text(formData, "slug"),
    description: text(formData, "description"),
    brandId: text(formData, "brandId"),
    sellingUnit: formData.get("sellingUnit"),
    minOrderQuantity: number(formData, "minOrderQuantity"),
    status: formData.get("status"),
    // Sending this replaces the informational values wholesale, per the contract.
    attributeValues: attributeValueFields(formData),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<Product>(`/products/${id}`, {
      method: "PATCH",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "slugOrSkuTaken" }));
  }

  updateTag(CACHE_TAGS.products);
  revalidatePath(`/${locale}/admin/products`, "layout");
  return { status: "success" };
}

export async function deleteProductAction(
  locale: Locale,
  id: Uuid,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<void>(`/products/${id}`, {
      method: "DELETE",
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "publishedCannotDelete" }));
  }

  updateTag(CACHE_TAGS.products);
  revalidatePath(`/${locale}/admin/products`, "layout");
  redirect(`/${locale}/admin/products`);
}
