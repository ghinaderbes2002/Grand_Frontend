import Link from "next/link";
import { notFound } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
import { Button } from "@/components/ui/button";
import { listCategories } from "@/lib/api/catalog";
import { listProducts } from "@/lib/api/products";
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
  const filters = {
    q: one(query.q),
    categoryId: one(query.categoryId),
    cursor: one(query.cursor),
    limit: 30,
  };

  const [page, categories] = await Promise.all([listProducts(filters), listCategories()]);

  // Carry the active filters into the next-page link alongside the cursor.
  const nextParams = new URLSearchParams();
  if (filters.q) nextParams.set("q", filters.q);
  if (filters.categoryId) nextParams.set("categoryId", filters.categoryId);
  if (page.nextCursor) nextParams.set("cursor", page.nextCursor);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">{dict.admin.products.title}</h2>
          <p className="text-muted max-w-xl text-sm">{dict.admin.products.subtitle}</p>
        </div>
        {can(session, PERMISSIONS.productsCreate) ? (
          <Link href={`/${lang}/admin/products/new`}>
            <Button>{dict.admin.products.newTitle}</Button>
          </Link>
        ) : null}
      </header>

      {/* The contract exposes no admin listing endpoint — `GET /products` is the
          public one and filters to PUBLISHED. Drafts are unreachable from here. */}
      <p className="border-border bg-surface/40 text-muted rounded-lg border px-3 py-2 text-sm">
        {dict.admin.products.listOnlyPublished}
      </p>

      <form method="get" className="flex flex-wrap items-end gap-3">
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
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.path || category.name}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit" className="h-10">
          {dict.admin.filters.apply}
        </Button>
        {filters.q || filters.categoryId ? (
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
        <ul className="border-border divide-border divide-y rounded-xl border">
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
