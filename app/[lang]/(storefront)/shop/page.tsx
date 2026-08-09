import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AttributeFilterFields } from "@/components/shop/attribute-filter-fields";
import { PageBanner } from "@/components/shop/page-shell";
import { ProductCard } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control";
import {
  listAttributes,
  listBrands,
  listCategories,
  listCategoryAttributes,
} from "@/lib/api/catalog";
import { listMedia } from "@/lib/api/media";
import { listProducts } from "@/lib/api/products";
import type { Attribute, CategoryAttribute } from "@/lib/api/types";
import {
  ATTR_QUERY_PREFIX,
  filterableAttributes,
  readAttributeParams,
  type FilterableAttribute,
} from "@/lib/shop/attribute-filters";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** Reads one search param as a string, ignoring repeated values. */
function one(value: string | string[] | undefined) {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/shop">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const dict = getDictionary(lang);
  return {
    title: dict.shop.title,
    description: dict.shop.subtitle,
    // Filtered listings are near-duplicates of each other; only the bare shop
    // URL is worth indexing.
    alternates: { canonical: `/${lang}/shop` },
  };
}

export default async function ShopPage({
  params,
  searchParams,
}: PageProps<"/[lang]/shop">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const query = await searchParams;

  const attributes = readAttributeParams(query);
  const filters = {
    q: one(query.q),
    categoryId: one(query.categoryId),
    brandId: one(query.brandId),
    minPrice: one(query.minPrice) ? Number(one(query.minPrice)) : undefined,
    maxPrice: one(query.maxPrice) ? Number(one(query.maxPrice)) : undefined,
    attributes,
    cursor: one(query.cursor),
    limit: 24,
  };

  const [page, categories, brands] = await Promise.all([
    listProducts(filters),
    listCategories(),
    listBrands(),
  ]);

  // One media call per product: the listing response carries no images and the
  // media endpoint takes a single entity. They run in parallel and the page
  // caps at 24 products, but embedding a thumbnail in the list response would
  // remove this entirely — it is on the list of asks for the backend.
  const images = new Map(
    await Promise.all(
      page.items.map(
        async (product) =>
          [
            product.id,
            (await listMedia("product", product.id).catch(() => []))[0] ?? null,
          ] as const,
      ),
    ),
  );

  // Attribute filters only exist relative to a category, so they appear once
  // one is chosen. Failing to load them narrows the form rather than breaking
  // the page.
  let attributeFilters: FilterableAttribute[] = [];
  if (filters.categoryId) {
    const [links, definitions] = await Promise.all([
      listCategoryAttributes(filters.categoryId),
      listAttributes(),
    ]).catch((): [CategoryAttribute[], Attribute[]] => [[], []]);

    attributeFilters = filterableAttributes(links, definitions, attributes);
  }

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const rootCategories = categories.filter((c) => c.parentId === null && c.isActive);
  const activeBrands = brands.filter((brand) => brand.isActive);

  // Carry the active filters into the next-page link alongside the cursor.
  const nextParams = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key === "cursor" || key === "limit" || key === "attributes") continue;
    if (value === undefined) continue;
    nextParams.set(key, String(value));
  }
  for (const [key, value] of Object.entries(attributes)) {
    nextParams.set(`${ATTR_QUERY_PREFIX}${key}`, value);
  }
  if (page.nextCursor) nextParams.set("cursor", page.nextCursor);

  // The same set minus the cursor: "back to the first page" of this filter.
  const baseParams = new URLSearchParams(nextParams);
  baseParams.delete("cursor");

  const hasAdvanced =
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    Object.keys(attributes).length > 0;
  const hasFilters =
    hasAdvanced || Boolean(filters.q || filters.categoryId || filters.brandId);

  /** One facet swapped, everything else kept, and the cursor always dropped. */
  const facetHref = (facet: "categoryId" | "brandId", value?: string) => {
    const next = new URLSearchParams();
    if (filters.q) next.set("q", filters.q);
    if (filters.minPrice !== undefined) next.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice !== undefined) next.set("maxPrice", String(filters.maxPrice));

    const other = facet === "categoryId" ? "brandId" : "categoryId";
    const kept = facet === "categoryId" ? filters.brandId : filters.categoryId;
    if (kept) next.set(other, kept);

    // Attribute filters belong to a category, so changing the category drops
    // them; they would filter on keys the new category does not have.
    if (facet !== "categoryId") {
      for (const [key, attrValue] of Object.entries(attributes)) {
        next.set(`${ATTR_QUERY_PREFIX}${key}`, attrValue);
      }
    }

    if (value) next.set(facet, value);
    const search = next.toString();
    return search ? `/${lang}/shop?${search}` : `/${lang}/shop`;
  };

  return (
    <>
      {/* A banner, not a bare heading: this is the page the header points at,
          so it opens the same way the home page does. */}
      <PageBanner
        eyebrow={dict.common.appName}
        title={dict.shop.title}
        subtitle={dict.shop.subtitle}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12">
        {/*
          A GET form: filters live in the URL, so results are shareable and the
          page keeps working without client-side JavaScript.

          Search and price stay in the form; category and brand became links
          instead — a pill row reads faster than a select, and every pill is a
          real URL a visitor can bookmark or share.
        */}
        <form method="get" className="flex flex-col gap-4">
          {/* The facets chosen by pill have to ride along, or submitting the
              search would silently clear them. */}
          {filters.categoryId ? (
            <input type="hidden" name="categoryId" value={filters.categoryId} />
          ) : null}
          {filters.brandId ? (
            <input type="hidden" name="brandId" value={filters.brandId} />
          ) : null}

          <div className="border-border bg-surface/40 flex flex-wrap items-center gap-2 rounded-full border p-2">
            <span className="flex min-w-48 flex-1 items-center gap-2 px-3">
              <SearchIcon className="text-muted size-4 shrink-0" />
              <label htmlFor="shop-q" className="sr-only">
                {dict.shop.search}
              </label>
              <input
                id="shop-q"
                name="q"
                defaultValue={filters.q}
                placeholder={dict.shop.searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
              />
            </span>

            <Button type="submit" size="sm">
              {dict.shop.apply}
            </Button>
            {hasFilters ? (
              <Link href={`/${lang}/shop`}>
                <Button type="button" variant="ghost" size="sm">
                  {dict.shop.clear}
                </Button>
              </Link>
            ) : null}
          </div>

          <details
            className="border-border rounded-2xl border px-4 py-3"
            open={hasAdvanced}
          >
            <summary className="text-muted hover:text-foreground cursor-pointer text-sm transition">
              {dict.shop.filters}
            </summary>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-sm">
                {dict.shop.minPrice}
                <input
                  name="minPrice"
                  type="number"
                  min={0}
                  defaultValue={filters.minPrice}
                  className={controlClass()}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                {dict.shop.maxPrice}
                <input
                  name="maxPrice"
                  type="number"
                  min={0}
                  defaultValue={filters.maxPrice}
                  className={controlClass()}
                />
              </label>

              {/* Attribute filters sit in the same GET form, so they arrive as
                  `attr_<key>` params exactly as the products endpoint expects. */}
              {filters.categoryId ? (
                <AttributeFilterFields filters={attributeFilters} locale={lang} />
              ) : (
                <p className="text-muted self-end pb-2 text-xs">
                  {dict.shop.pickCategoryFirst}
                </p>
              )}
            </div>
          </details>
        </form>

        <FacetRow
          label={dict.admin.products.category}
          allLabel={dict.shop.allCategories}
          allHref={facetHref("categoryId")}
          active={filters.categoryId}
          items={rootCategories.map((category) => ({
            id: category.id,
            name: category.name,
            href: facetHref("categoryId", category.id),
          }))}
        />

        <FacetRow
          label={dict.admin.products.brand}
          allLabel={dict.shop.allBrands}
          allHref={facetHref("brandId")}
          active={filters.brandId}
          items={activeBrands.map((brand) => ({
            id: brand.id,
            name: brand.name,
            href: facetHref("brandId", brand.id),
          }))}
        />

        {page.items.length === 0 ? (
          <div className="border-border flex flex-col items-center gap-4 rounded-2xl border border-dashed p-12">
            <p className="text-muted text-sm">{dict.shop.noResults}</p>
            <Link href={`/${lang}/shop`}>
              <Button variant="ghost">{dict.shop.clear}</Button>
            </Link>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {page.items.map((product) => (
              <li key={product.id} className="reveal">
                <ProductCard
                  product={product}
                  image={images.get(product.id) ?? null}
                  locale={lang}
                  categoryName={categoryNames.get(product.categoryId)}
                />
              </li>
            ))}
          </ul>
        )}

        {/* Cursor paging only moves forward, so this replaces the list rather
            than appending to it — hence "next page", and a way back to the
            start for anyone several pages deep. */}
        {page.nextCursor || filters.cursor ? (
          <div className="flex items-center justify-center gap-2">
            {filters.cursor ? (
              <Link href={`/${lang}/shop?${baseParams.toString()}`}>
                <Button variant="ghost">{dict.shop.firstPage}</Button>
              </Link>
            ) : null}
            {page.nextCursor ? (
              <Link href={`/${lang}/shop?${nextParams.toString()}`}>
                <Button variant="ghost">{dict.shop.loadMore}</Button>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

/** A scrollable row of facet pills, with "all" as the resting state. */
function FacetRow({
  label,
  allLabel,
  allHref,
  active,
  items,
}: {
  label: string;
  allLabel: string;
  allHref: string;
  active?: string;
  items: Array<{ id: string; name: string; href: string }>;
}) {
  if (items.length === 0) return null;

  const pill = (isActive: boolean) =>
    `inline-flex shrink-0 rounded-full border px-4 py-2 text-sm transition ${
      isActive
        ? "border-accent bg-accent text-accent-foreground"
        : "border-border hover:border-accent hover:text-accent-strong"
    }`;

  return (
    <nav aria-label={label} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <Link href={allHref} className={pill(!active)} aria-current={!active || undefined}>
        {allLabel}
      </Link>
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={pill(active === item.id)}
          aria-current={active === item.id || undefined}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
