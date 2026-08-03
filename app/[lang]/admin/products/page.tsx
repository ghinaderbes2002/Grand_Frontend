import Link from "next/link";
import { notFound } from "next/navigation";

import { PlusIcon } from "@/components/admin/icons";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { listCategories } from "@/lib/api/catalog";
import { categoryOptions } from "@/lib/catalog/category-labels";
import { listAdminProducts } from "@/lib/api/products";
import type { ProductStatus } from "@/lib/api/types";

const PRODUCT_STATUSES: ProductStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { formatAmount } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

function one(value: string | string[] | undefined) {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export default async function ProductsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/admin/products">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/products`);

  if (!can(session, PERMISSIONS.productsRead)) {
    return <NoAccess locale={lang} />;
  }

  const query = await searchParams;
  const rawStatus = one(query.status);
  const filters = {
    q: one(query.q),
    categoryId: one(query.categoryId),
    status: PRODUCT_STATUSES.includes(rawStatus as ProductStatus)
      ? (rawStatus as ProductStatus)
      : undefined,
    cursor: one(query.cursor),
    limit: 30,
  };

  // `/products/admin` returns every status. The public `/products` is
  // PUBLISHED-only, which used to make a freshly created draft unreachable.
  const [page, categories] = await Promise.all([
    listAdminProducts(filters),
    listCategories(),
  ]);

  // Carry the active filters into the next-page link alongside the cursor.
  const nextParams = new URLSearchParams();
  if (filters.q) nextParams.set("q", filters.q);
  if (filters.categoryId) nextParams.set("categoryId", filters.categoryId);
  if (filters.status) nextParams.set("status", filters.status);
  if (page.nextCursor) nextParams.set("cursor", page.nextCursor);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={dict.admin.products.title}
        subtitle={dict.admin.products.subtitle}
        action={
          can(session, PERMISSIONS.productsCreate) ? (
            <Link href={`/${lang}/admin/products/new`}>
              <Button className="gap-2">
                <PlusIcon className="size-4" />
                {dict.admin.products.newTitle}
              </Button>
            </Link>
          ) : null
        }
      />

      <form
        method="get"
        className="border-border bg-surface/30 flex flex-wrap items-end gap-3 rounded-2xl border p-4"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          {dict.admin.filters.search}
          <input
            name="q"
            defaultValue={filters.q}
            placeholder={dict.admin.filters.searchPlaceholder}
            className="border-border bg-background h-10 w-56 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
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
          {dict.admin.products.status}
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="border-border bg-background h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">{dict.admin.filters.allStatuses}</option>
            {PRODUCT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {dict.admin.products.statuses[value]}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit" className="h-10">
          {dict.admin.filters.apply}
        </Button>
        {filters.q || filters.categoryId || filters.status ? (
          <Link href={`/${lang}/admin/products`}>
            <Button type="button" variant="ghost" className="h-10">
              {dict.admin.filters.clear}
            </Button>
          </Link>
        ) : null}
      </form>

      {page.items.length === 0 ? (
        <p className="text-muted text-sm">{dict.admin.empty}</p>
      ) : (
        <ul className="border-border divide-border divide-y rounded-2xl border">
          {page.items.map((product) => (
            <li key={product.id}>
              <Link
                href={`/${lang}/admin/products/${product.id}`}
                className="hover:bg-surface flex items-center justify-between gap-3 px-4 py-3 transition"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{product.name}</span>
                  <span className="text-muted font-mono text-xs">{product.slug}</span>
                </span>
                <span className="border-border text-muted rounded-md border px-2 py-0.5 text-xs whitespace-nowrap">
                  {dict.admin.products.statuses[product.status]}
                </span>
                <span className="text-muted text-xs">
                  {product.displayPrice
                    ? product.displayPrice.min === product.displayPrice.max
                      ? formatAmount(product.displayPrice.min, lang)
                      : `${formatAmount(product.displayPrice.min, lang)} – ${formatAmount(product.displayPrice.max, lang)}`
                    : dict.admin.prices.noPrices}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {page.nextCursor ? (
        <Link
          href={`/${lang}/admin/products?${nextParams.toString()}`}
          className="self-center"
        >
          <Button variant="ghost">{dict.admin.filters.loadMore}</Button>
        </Link>
      ) : null}
    </div>
  );
}
