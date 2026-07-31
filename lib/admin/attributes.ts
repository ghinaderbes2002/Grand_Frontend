"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import type { Attribute, AttributeOption, Uuid } from "@/lib/api/types";
import { requireSession } from "@/lib/auth/session";
import { describeApiError } from "@/lib/forms/api-error";
import { checkbox, compact, number, text } from "@/lib/forms/fields";
import { errorState, fieldErrorState, type FormState } from "@/lib/forms/state";
import type { Locale } from "@/lib/i18n/config";
import { attributeOptionSchema, attributeSchema, attributeUpdateSchema } from "./schemas";

export async function createAttributeAction(
  locale: Locale,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = attributeSchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    type: formData.get("type"),
    unit: text(formData, "unit"),
    isFilterable: checkbox(formData, "isFilterable"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  let created: Attribute;
  try {
    created = await apiFetch<Attribute>("/attributes", {
      method: "POST",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "keyTaken" }));
  }

  revalidatePath(`/${locale}/admin/attributes`, "layout");
  redirect(`/${locale}/admin/attributes/${created.id}`);
}

export async function updateAttributeAction(
  locale: Locale,
  id: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  // `key` and `type` are deliberately not read: the API rejects changing them,
  // because existing products carry values typed against them.
  const parsed = attributeUpdateSchema.safeParse({
    name: formData.get("name"),
    unit: text(formData, "unit"),
    isFilterable: checkbox(formData, "isFilterable"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<Attribute>(`/attributes/${id}`, {
      method: "PATCH",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  revalidatePath(`/${locale}/admin/attributes`, "layout");
  return { status: "success" };
}

export async function deleteAttributeAction(
  locale: Locale,
  id: Uuid,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<void>(`/attributes/${id}`, {
      method: "DELETE",
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "attributeInUse" }));
  }

  revalidatePath(`/${locale}/admin/attributes`, "layout");
  redirect(`/${locale}/admin/attributes`);
}

// --- Options ---------------------------------------------------------------

export async function addAttributeOptionAction(
  locale: Locale,
  attributeId: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = attributeOptionSchema.safeParse({
    value: formData.get("value"),
    label: formData.get("label"),
    sortOrder: number(formData, "sortOrder"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<AttributeOption>(`/attributes/${attributeId}/options`, {
      method: "POST",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "optionValueTaken" }));
  }

  revalidatePath(`/${locale}/admin/attributes/${attributeId}`);
  return { status: "success" };
}

export async function deleteAttributeOptionAction(
  locale: Locale,
  attributeId: Uuid,
  optionId: Uuid,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<void>(`/attributes/${attributeId}/options/${optionId}`, {
      method: "DELETE",
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  revalidatePath(`/${locale}/admin/attributes/${attributeId}`);
  return { status: "success" };
}
