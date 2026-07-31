import "server-only";

import { apiFetch, type QueryValue } from "./client";
import type {
  CursorPage,
  Price,
  Product,
  ProductListQuery,
  ProductVariant,
  Uuid,
} from "./types";

const fresh = { cache: "no-store" } as const;

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

  return apiFetch<CursorPage<Product>>("/products", { ...fresh, query: params });
}

/** Storefront detail; 404s unless the product is `PUBLISHED`. */
export function getProductBySlug(slug: string) {
  return apiFetch<Product>(`/products/slug/${slug}`, fresh);
}

/** Admin detail — any status. Requires `products.read`. */
export function getProduct(id: Uuid) {
  return apiFetch<Product>(`/products/${id}`, { ...fresh, auth: true });
}

export function listVariants(productId: Uuid) {
  return apiFetch<ProductVariant[]>(`/products/${productId}/variants`, {
    ...fresh,
    auth: true,
  });
}

export function getVariant(productId: Uuid, variantId: Uuid) {
  return apiFetch<ProductVariant & { prices?: Price[] }>(
    `/products/${productId}/variants/${variantId}`,
    { ...fresh, auth: true },
  );
}
