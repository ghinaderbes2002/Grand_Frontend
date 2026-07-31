"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import type { Category, CategoryAttribute, Uuid } from "@/lib/api/types";
import { requireSession } from "@/lib/auth/session";
import { describeApiError } from "@/lib/forms/api-error";
import { checkbox, compact, number, text } from "@/lib/forms/fields";
import { errorState, fieldErrorState, type FormState } from "@/lib/forms/state";
import type { Locale } from "@/lib/i18n/config";
import { categoryAttributeSchema, categorySchema } from "./schemas";

/**
 * Category mutations.
 *
 * Every action re-checks the session even though `proxy.ts` guards the route:
 * Server Actions are reachable by direct POST, so the route guard is not a
 * substitute for checking here.
 */

function readCategoryForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    slug: text(formData, "slug"),
    // Blank means "top level", which the API expects as an explicit null.
    parentId: text(formData, "parentId") ?? null,
    sortOrder: number(formData, "sortOrder"),
    imageUrl: text(formData, "imageUrl"),
    seoTitle: text(formData, "seoTitle"),
    seoDescription: text(formData, "seoDescription"),
    isActive: checkbox(formData, "isActive"),
  });
}

export async function createCategoryAction(
  locale: Locale,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = readCategoryForm(formData);
  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  let created: Category;
  try {
    created = await apiFetch<Category>("/categories", {
      method: "POST",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(
      ...describeApiError(error, { 404: "parentNotFound", 409: "slugTaken" }),
    );
  }

  revalidatePath(`/${locale}/admin/categories`, "layout");
  redirect(`/${locale}/admin/categories/${created.id}`);
}

export async function updateCategoryAction(
  locale: Locale,
  id: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = readCategoryForm(formData);
  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<Category>(`/categories/${id}`, {
      method: "PATCH",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    // A 409 here is ambiguous — duplicate slug or an attempted cycle — so the
    // API's own message is more use than a guessed translation.
    return errorState(...describeApiError(error, { 404: "parentNotFound" }));
  }

  revalidatePath(`/${locale}/admin/categories`, "layout");
  return { status: "success" };
}

export async function deleteCategoryAction(
  locale: Locale,
  id: Uuid,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<void>(`/categories/${id}`, {
      method: "DELETE",
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "categoryHasChildren" }));
  }

  revalidatePath(`/${locale}/admin/categories`, "layout");
  redirect(`/${locale}/admin/categories`);
}

// --- Category ↔ attribute links -------------------------------------------

export async function linkAttributeAction(
  locale: Locale,
  categoryId: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = categoryAttributeSchema.safeParse({
    categoryId,
    attributeId: formData.get("attributeId"),
    isRequired: checkbox(formData, "isRequired"),
    isFilterable: checkbox(formData, "isFilterable"),
    createsVariant: checkbox(formData, "createsVariant"),
    sortOrder: number(formData, "sortOrder"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<CategoryAttribute>("/category-attributes", {
      method: "POST",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, { 409: "linkExists" }));
  }

  revalidatePath(`/${locale}/admin/categories/${categoryId}`);
  return { status: "success" };
}

export async function unlinkAttributeAction(
  locale: Locale,
  categoryId: Uuid,
  attributeId: Uuid,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<void>(`/category-attributes/${categoryId}/${attributeId}`, {
      method: "DELETE",
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  revalidatePath(`/${locale}/admin/categories/${categoryId}`);
  return { status: "success" };
}
