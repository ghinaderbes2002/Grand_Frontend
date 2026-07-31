import "server-only";

import { apiFetch } from "./client";
import type {
  Attribute,
  Brand,
  Category,
  CategoryAttribute,
  CategoryDetail,
  CategoryTreeNode,
  Uuid,
} from "./types";

/**
 * Catalog reads.
 *
 * All of these are public on the API, so no token is attached. They are
 * uncached (`no-store`) because the admin screens must show what was just
 * written — the storefront can layer caching on top later.
 */

const fresh = { cache: "no-store" } as const;

export function listCategories() {
  return apiFetch<Category[]>("/categories", fresh);
}

export function getCategoryTree() {
  return apiFetch<CategoryTreeNode[]>("/categories/tree", fresh);
}

export function getCategory(id: Uuid) {
  return apiFetch<CategoryDetail>(`/categories/${id}`, fresh);
}

export function listAttributes() {
  return apiFetch<Attribute[]>("/attributes", fresh);
}

export function getAttribute(id: Uuid) {
  return apiFetch<Attribute>(`/attributes/${id}`, fresh);
}

export function listCategoryAttributes(categoryId: Uuid) {
  return apiFetch<CategoryAttribute[]>("/category-attributes", {
    ...fresh,
    query: { categoryId },
  });
}

export function listBrands() {
  return apiFetch<Brand[]>("/brands", fresh);
}

export function getBrand(id: Uuid) {
  return apiFetch<Brand>(`/brands/${id}`, fresh);
}
