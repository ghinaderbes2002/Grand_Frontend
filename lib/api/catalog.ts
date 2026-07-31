import "server-only";

import { CACHE_TAGS, STRUCTURE_TTL, publicCache } from "./cache";
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
 * All of these are public on the API, so no token is attached — which is also
 * what makes them cacheable. The catalog structure is read on nearly every
 * page and changes rarely; admin mutations invalidate it by tag, so an edit is
 * visible immediately rather than after the TTL.
 */

const categories = publicCache(STRUCTURE_TTL, [CACHE_TAGS.categories]);
const attributes = publicCache(STRUCTURE_TTL, [CACHE_TAGS.attributes]);
const brands = publicCache(STRUCTURE_TTL, [CACHE_TAGS.brands]);

export function listCategories() {
  return apiFetch<Category[]>("/categories", categories);
}

export function getCategoryTree() {
  return apiFetch<CategoryTreeNode[]>("/categories/tree", categories);
}

export function getCategory(id: Uuid) {
  // Tagged with attributes too: this response embeds `categoryAttributes`, so
  // linking or unlinking an attribute changes it.
  return apiFetch<CategoryDetail>(
    `/categories/${id}`,
    publicCache(STRUCTURE_TTL, [CACHE_TAGS.categories, CACHE_TAGS.attributes]),
  );
}

export function listAttributes() {
  return apiFetch<Attribute[]>("/attributes", attributes);
}

export function getAttribute(id: Uuid) {
  return apiFetch<Attribute>(`/attributes/${id}`, attributes);
}

export function listCategoryAttributes(categoryId: Uuid) {
  return apiFetch<CategoryAttribute[]>("/category-attributes", {
    ...publicCache(STRUCTURE_TTL, [CACHE_TAGS.categories, CACHE_TAGS.attributes]),
    query: { categoryId },
  });
}

export function listBrands() {
  return apiFetch<Brand[]>("/brands", brands);
}

export function getBrand(id: Uuid) {
  return apiFetch<Brand>(`/brands/${id}`, brands);
}
