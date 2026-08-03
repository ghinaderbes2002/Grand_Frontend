import "server-only";

import { cache } from "react";

import { CACHE_TAGS, CATALOG_TTL, publicCache } from "./cache";
import { apiFetch, type QueryValue } from "./client";
import type {
  CursorPage,
  Price,
  Product,
  ProductListQuery,
  ProductStatus,
  ProductVariant,
  Uuid,
} from "./types";

/** Public storefront reads, invalidated by tag when the catalog changes. */
const publicProducts = publicCache(CATALOG_TTL, [CACHE_TAGS.products]);

/** Admin reads carry a token, so `client.ts` forces them uncached regardless. */
const adminRead = { cache: "no-store", auth: true } as const;

/**
 * Storefront listing. Public, and **`PUBLISHED` only** — the contract exposes
 * no admin listing endpoint, so drafts and archived products cannot be
 * enumerated. `getProduct` reads any status, but only if you know the id.
 */
export function listProducts(query: ProductListQuery = {}) {
  const { attributes, ...rest } = query;

  const params: Record<string, QueryValue> = { ...rest };
  for (const [key, value] of Object.entries(attributes ?? {})) {
    params[`attr_${key}`] = value;
  }

  return apiFetch<CursorPage<Product>>("/products", {
    ...publicProducts,
    query: params,
  });
}

/**
 * Storefront detail; 404s unless the product is `PUBLISHED`.
 *
 * Wrapped in `cache` so `generateMetadata` and the page body share one call
 * within a single render, on top of the cross-request cache.
 */
export const getProductBySlug = cache((slug: string) =>
  apiFetch<Product>(`/products/slug/${slug}`, publicProducts),
);

/**
 * Admin listing — every status, not just `PUBLISHED`. Same query params as the
 * storefront listing plus `status`. This is what makes drafts reachable; before
 * it existed you had to already know a product's id.
 */
export function listAdminProducts(
  query: ProductListQuery & { status?: ProductStatus } = {},
) {
  const { attributes, ...rest } = query;

  const params: Record<string, QueryValue> = { ...rest };
  for (const [key, value] of Object.entries(attributes ?? {})) {
    params[`attr_${key}`] = value;
  }

  return apiFetch<CursorPage<Product>>("/products/admin", {
    ...adminRead,
    query: params,
  });
}

/** Admin detail — any status. Requires `products.read`. */
export function getProduct(id: Uuid) {
  return apiFetch<Product>(`/products/${id}`, adminRead);
}

export function listVariants(productId: Uuid) {
  return apiFetch<ProductVariant[]>(`/products/${productId}/variants`, adminRead);
}

export function getVariant(productId: Uuid, variantId: Uuid) {
  return apiFetch<ProductVariant & { prices?: Price[] }>(
    `/products/${productId}/variants/${variantId}`,
    adminRead,
  );
}
