import Link from "next/link";
import { notFound } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
import { ProductForm } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";
import { splitCategoryAttributes } from "@/lib/admin/attribute-specs";
import { getCategory, listAttributes, listBrands, listCategories } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/errors";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * Creating a product is two steps because the form depends on the category:
 * the category decides the product type and which attribute fields exist. Step
 * one is a plain GET form, so it needs no client JavaScript.
 */
export default async function NewProductPage({
  params,
  searchParams,
}: PageProps<"/[lang]/admin/products/new">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/products/new`);

  if (!can(session, PERMISSIONS.productsCreate)) {
    return <NoAccess locale={lang} />;
  }

  const { categoryId } = await searchParams;
  const selectedId = typeof categoryId === "string" ? categoryId : undefined;

  const back = (
    <Link
      href={`/${lang}/admin/products`}
      className="text-muted hover:text-foreground text-sm"
    >
      ← {dict.admin.products.title}
    </Link>
  );

  if (!selectedId) {
    const categories = await listCategories();

    return (
      <div className="flex max-w-lg flex-col gap-6">
        {back}
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">{dict.admin.products.chooseCategory}</h2>
          <p className="text-muted text-sm">{dict.admin.products.chooseCategoryHint}</p>
        </div>

        {categories.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.empty}</p>
        ) : (
          <form method="get" className="flex flex-col gap-4">
            <select
              name="categoryId"
              aria-label={dict.admin.products.category}
              className="border-border bg-background h-11 rounded-lg border px-3 text-sm outline-none transition focus:ring-2 focus:ring-accent/40"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.path || category.name}
                </option>
              ))}
            </select>
            <Button type="submit" className="w-fit">
              {dict.admin.products.continue}
            </Button>
          </form>
        )}
      </div>
    );
  }

  const category = await getCategory(selectedId).catch((error: unknown) => {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  });

  const [attributes, brands] = await Promise.all([listAttributes(), listBrands()]);
  const { informational, variantCreating } = splitCategoryAttributes(
    category.categoryAttributes,
    attributes,
  );

  // The contract rejects SIMPLE for a category that has variant-creating
  // attributes, so the type is decided here rather than left to the user.
  const type = variantCreating.length > 0 ? "VARIABLE" : "SIMPLE";

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {back}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{dict.admin.products.newTitle}</h2>
        <p className="text-muted text-sm">
          {dict.admin.products.category}: {category.path || category.name}
        </p>
      </div>

      <ProductForm
        categoryId={category.id}
        type={type}
        brands={brands}
        attributeSpecs={informational}
      />
    </div>
  );
}
