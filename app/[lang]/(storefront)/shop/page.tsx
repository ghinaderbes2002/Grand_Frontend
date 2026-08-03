import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AttributeFilterFields } from "@/components/shop/attribute-filter-fields";
import { CategoryNav } from "@/components/shop/category-nav";
import { ProductCard } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import {
  getCategoryTree,
  listAttributes,
  listBrands,
  listCategories,
  listCategoryAttributes,
} from "@/lib/api/catalog";
import { categoryOptions } from "@/lib/catalog/category-labels";
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

  const [page, categories, brands, tree] = await Promise.all([
    listProducts(filters),
    listCategories(),
    listBrands(),
    getCategoryTree().catch(() => []),
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
  // one is chosen. The contract points at `/category-attributes` for exactly
  // this. Failing to load them narrows the form rather than breaking the page.
  let attributeFilters: FilterableAttribute[] = [];
  if (filters.categoryId) {
    const [links, definitions] = await Promise.all([
      listCategoryAttributes(filters.categoryId),
      listAttributes(),
    ]).catch((): [CategoryAttribute[], Attribute[]] => [[], []]);

    attributeFilters = filterableAttributes(links, definitions, attributes);
  }

  // Carry the active filters into the "load more" link alongside the cursor.
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

  // Category links preserve whatever else is filtered.
  const navParams = new URLSearchParams();
  if (filters.q) navParams.set("q", filters.q);
  if (filters.brandId) navParams.set("brandId", filters.brandId);
  if (filters.minPrice !== undefined) navParams.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) navParams.set("maxPrice", String(filters.maxPrice));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.shop.title}</h1>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* The category rail is a `<details>` so it collapses on phones
            instead of pushing the products off the first screen. */}
        <details className="border-border rounded-2xl border p-4 lg:border-0 lg:p-0" open>
          <summary className="cursor-pointer text-sm font-medium lg:hidden">
            {dict.shop.browseCategories}
          </summary>
          <div className="mt-3 lg:mt-0">
            <CategoryNav
              tree={tree}
              locale={lang}
              selectedId={filters.categoryId}
              query={navParams}
            />
          </div>
        </details>

        <div className="flex min-w-0 flex-col gap-6">
      {/* A GET form: filters live in the URL, so results are shareable and the
          page keeps working without client-side JavaScript. */}
      <form
        method="get"
        className="border-border bg-surface/30 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          {dict.shop.search}
          <input
            name="q"
            defaultValue={filters.q}
            placeholder={dict.shop.searchPlaceholder}
            className="border-border bg-background h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          {dict.admin.products.category}
          <select
            name="categoryId"
            defaultValue={filters.categoryId ?? ""}
            className="border-border bg-background h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">{dict.shop.allCategories}</option>
            {categoryOptions(categories).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          {dict.admin.products.brand}
          <select
            name="brandId"
            defaultValue={filters.brandId ?? ""}
            className="border-border bg-background h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">{dict.shop.allBrands}</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          {dict.shop.minPrice}
          <input
            name="minPrice"
            type="number"
            min={0}
            defaultValue={filters.minPrice}
            className="border-border bg-background h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          {dict.shop.maxPrice}
          <input
            name="maxPrice"
            type="number"
            min={0}
            defaultValue={filters.maxPrice}
            className="border-border bg-background h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>

        {/* Attribute filters sit in the same GET form, so they arrive as
            `attr_<key>` params exactly as the products endpoint expects. */}
        {filters.categoryId ? (
          <>
            <p className="text-muted col-span-full text-xs font-medium">
              {dict.shop.attributeFilters}
            </p>
            <AttributeFilterFields filters={attributeFilters} locale={lang} />
          </>
        ) : (
          <p className="text-muted col-span-full text-xs">
            {dict.shop.pickCategoryFirst}
          </p>
        )}

        <div className="col-span-full flex items-end gap-2">
          <Button type="submit" className="h-10">
            {dict.shop.apply}
          </Button>
          <Link href={`/${lang}/shop`}>
            <Button type="button" variant="ghost" className="h-10">
              {dict.shop.clear}
            </Button>
          </Link>
        </div>
      </form>

      {page.items.length === 0 ? (
        <div className="border-border flex flex-col items-start gap-4 rounded-2xl border border-dashed p-8">
          <p className="text-muted text-sm">{dict.shop.noResults}</p>
          <Link href={`/${lang}/shop`}>
            <Button variant="ghost">{dict.shop.clear}</Button>
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {page.items.map((product) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                image={images.get(product.id) ?? null}
                locale={lang}
              />
            </li>
          ))}
        </ul>
      )}

      {page.nextCursor ? (
        <Link href={`/${lang}/shop?${nextParams.toString()}`} className="self-center">
          <Button variant="ghost">{dict.shop.loadMore}</Button>
        </Link>
      ) : null}
        </div>
      </div>
    </div>
  );
}
