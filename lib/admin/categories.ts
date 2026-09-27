"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { CACHE_TAGS } from "@/lib/api/cache";
import { listCategories, listCategoryAttributes } from "@/lib/api/catalog";
import { apiFetch } from "@/lib/api/client";
import { listAdminProducts } from "@/lib/api/products";
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

  updateTag(CACHE_TAGS.categories);
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

  updateTag(CACHE_TAGS.categories);
  revalidatePath(`/${locale}/admin/categories`, "layout");
  return { status: "success" };
}

export async function deleteCategoryAction(
  locale: Locale,
  id: Uuid,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  // The API refuses a category that is still in use but answers with a bare
  // 500, which told the admin nothing. So the usual blockers are checked here
  // first and named, with what to do about each.
  const blocker = await findDeleteBlocker(id);
  if (blocker) return errorState(blocker);

  try {
    await apiFetch<void>(`/categories/${id}`, {
      method: "DELETE",
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(
      ...describeApiError(error, {
        409: "categoryHasChildren",
        // Something the checks above did not catch still holds on to it.
        500: "categoryDeleteFailed",
      }),
    );
  }

  updateTag(CACHE_TAGS.categories);
  revalidatePath(`/${locale}/admin/categories`, "layout");
  redirect(`/${locale}/admin/categories`);
}

/**
 * Why a category cannot be deleted, if anything visible stops it: children
 * first (the most fundamental), then products, then linked attributes. A check
 * that fails to load is skipped rather than blocking — the API still has the
 * final say.
 */
async function findDeleteBlocker(id: Uuid) {
  const [children, products, attributes] = await Promise.all([
    listCategories()
      .then((all) => all.some((category) => category.parentId === id))
      .catch(() => false),
    listAdminProducts({ categoryId: id, limit: 1 })
      .then((page) => page.items.length > 0)
      .catch(() => false),
    listCategoryAttributes(id)
      .then((links) => links.length > 0)
      .catch(() => false),
  ]);

  if (children) return "categoryHasChildren" as const;
  if (products) return "categoryHasProducts" as const;
  if (attributes) return "categoryHasAttributes" as const;
  return null;
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

  updateTag(CACHE_TAGS.categories);
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

  updateTag(CACHE_TAGS.categories);
  revalidatePath(`/${locale}/admin/categories/${categoryId}`);
  return { status: "success" };
}
