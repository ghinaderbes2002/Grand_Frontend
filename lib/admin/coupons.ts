"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import type { Coupon, Uuid } from "@/lib/api/types";
import { requireSession } from "@/lib/auth/session";
import { describeApiError } from "@/lib/forms/api-error";
import { checkbox, compact, number, text } from "@/lib/forms/fields";
import { errorState, fieldErrorState, type FormState } from "@/lib/forms/state";
import type { Locale } from "@/lib/i18n/config";
import { couponSchema } from "./schemas";

/** A blank date input means "no bound", which the API expects as an absent field. */
function isoOrUndefined(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function readCouponForm(formData: FormData) {
  return couponSchema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: number(formData, "value"),
    maxUses: number(formData, "maxUses"),
    minOrderTotal: number(formData, "minOrderTotal"),
    startsAt: isoOrUndefined(text(formData, "startsAt")),
    expiresAt: isoOrUndefined(text(formData, "expiresAt")),
    isActive: checkbox(formData, "isActive"),
  });
}

export async function createCouponAction(
  locale: Locale,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = readCouponForm(formData);
  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  let created: Coupon;
  try {
    created = await apiFetch<Coupon>("/coupons", {
      method: "POST",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "keyTaken" }));
  }

  revalidatePath(`/${locale}/admin/coupons`, "layout");
  redirect(`/${locale}/admin/coupons/${created.id}`);
}

export async function updateCouponAction(
  locale: Locale,
  id: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = readCouponForm(formData);
  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<Coupon>(`/coupons/${id}`, {
      method: "PATCH",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "keyTaken" }));
  }

  revalidatePath(`/${locale}/admin/coupons`, "layout");
  return { status: "success" };
}
