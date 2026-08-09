import { notFound } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
import { Card, PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control";
import { splitCategoryAttributes } from "@/lib/admin/attribute-specs";
import { getCategory, listAttributes, listBrands, listCategories } from "@/lib/api/catalog";
import { categoryOptions } from "@/lib/catalog/category-labels";
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

  const back = {
    href: `/${lang}/admin/products`,
    label: dict.admin.products.title,
  };

  if (!selectedId) {
    const categories = await listCategories();

    return (
      <div className="flex max-w-lg flex-col gap-6">
        <PageHeader
          back={back}
          title={dict.admin.products.chooseCategory}
          subtitle={dict.admin.products.chooseCategoryHint}
        />

        {categories.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.empty}</p>
        ) : (
          <form method="get" className="flex flex-col gap-4">
            <select
              name="categoryId"
              aria-label={dict.admin.products.category}
              className={controlClass()}
            >
              {categoryOptions(categories).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
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
      <PageHeader
        back={back}
        title={dict.admin.products.newTitle}
        subtitle={`${dict.admin.products.category}: ${category.name}`}
      />

      <Card>
        <ProductForm
          categoryId={category.id}
          type={type}
          brands={brands}
          attributeSpecs={informational}
        />
      </Card>
    </div>
  );
}
