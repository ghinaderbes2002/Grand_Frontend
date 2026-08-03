"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import type { InventoryMovement, Uuid, Warehouse } from "@/lib/api/types";
import { requireSession } from "@/lib/auth/session";
import { describeApiError } from "@/lib/forms/api-error";
import { checkbox, compact, number, text } from "@/lib/forms/fields";
import { errorState, fieldErrorState, type FormState } from "@/lib/forms/state";
import type { Locale } from "@/lib/i18n/config";
import {
  adjustInventorySchema,
  receiveInventorySchema,
  warehouseSchema,
  warehouseUpdateSchema,
} from "./schemas";

/**
 * Inventory mutations.
 *
 * `warehouseId` is never sent: the contract says every other module falls back
 * to the first active warehouse, and there is no warehouse picker in the UI
 * yet, so leaving it off keeps this consistent with how orders behave.
 */

export async function receiveInventoryAction(
  locale: Locale,
  productId: Uuid,
  variantId: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = receiveInventorySchema.safeParse({
    variantId,
    quantity: number(formData, "quantity"),
    reason: text(formData, "reason"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<InventoryMovement>("/inventory/receive", {
      method: "POST",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  revalidatePath(`/${locale}/admin/products/${productId}`, "layout");
  return { status: "success" };
}

export async function adjustInventoryAction(
  locale: Locale,
  productId: Uuid,
  variantId: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = adjustInventorySchema.safeParse({
    variantId,
    quantityDelta: number(formData, "quantityDelta"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<InventoryMovement>("/inventory/adjustments", {
      method: "POST",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    // 409 means the adjustment would take stock below what open orders have
    // already reserved.
    return errorState(...describeApiError(error, { 409: "belowReserved" }));
  }

  revalidatePath(`/${locale}/admin/products/${productId}`, "layout");
  return { status: "success" };
}

/**
 * Warehouses are never deleted — only deactivated. Removing one that has stock
 * movements against it would orphan history, and the API refuses to disable the
 * last active one because orders need a default warehouse to fall back to.
 */
export async function updateWarehouseAction(
  locale: Locale,
  id: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = warehouseUpdateSchema.safeParse({
    name: formData.get("name"),
    isActive: checkbox(formData, "isActive"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<Warehouse>(`/warehouses/${id}`, {
      method: "PATCH",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "lastActiveWarehouse" }));
  }

  revalidatePath(`/${locale}/admin/warehouses`, "layout");
  return { status: "success" };
}

export async function createWarehouseAction(
  locale: Locale,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = warehouseSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    isActive: checkbox(formData, "isActive"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<Warehouse>("/warehouses", {
      method: "POST",
      body: parsed.data,
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "keyTaken" }));
  }

  revalidatePath(`/${locale}/admin/warehouses`, "layout");
  return { status: "success" };
}
