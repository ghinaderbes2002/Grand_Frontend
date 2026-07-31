/**
 * Cache tags and lifetimes for the **public** catalog reads.
 *
 * Only data the API serves without a token is cached — see the guard in
 * `client.ts`. Admin mutations call `revalidateTag` so an edit shows up
 * immediately; the `revalidate` values below are just a backstop for changes
 * made outside this app (a CSV import, another admin, a direct DB fix).
 */
export const CACHE_TAGS = {
  categories: "categories",
  attributes: "attributes",
  brands: "brands",
  products: "products",
  media: "media",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Lifetimes, scaled by `CACHE_TTL_SCALE`.
 *
 * Set the scale to `0` to disable caching entirely — the end-to-end suites do
 * this, because they seed through the API directly rather than through the
 * Server Actions that invalidate, so cached catalog reads would go stale within
 * a test run in a way production never does.
 *
 * The same caveat applies in production to any write this app does not make: a
 * CSV import run elsewhere, another admin client, a direct database edit. Those
 * are what the lifetimes below are a backstop for — tag invalidation covers
 * everything this app does itself.
 */
const SCALE = Number(process.env.CACHE_TTL_SCALE ?? "1");

/** Catalog structure changes rarely and is read on nearly every page. */
export const STRUCTURE_TTL = 300 * SCALE;

/**
 * Products and images move more often — a price edit or a status flip should
 * not sit stale for long even if a tag invalidation is missed.
 */
export const CATALOG_TTL = 60 * SCALE;

export function publicCache(revalidate: number, tags: CacheTag[]) {
  // `revalidate: 0` is not the same as not caching — it still stores an entry.
  // Opting out has to be explicit.
  if (revalidate <= 0) return { cache: "no-store" } as const;

  return { next: { revalidate, tags } } as const;
}
