import Link from "next/link";
import { notFound } from "next/navigation";

import { BulkPriceForm } from "@/components/admin/bulk-price-form";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { MediaManager } from "@/components/admin/media-manager";
import { NewItemDialog } from "@/components/admin/new-item-dialog";
import { NoAccess } from "@/components/admin/no-access";
import { Card, PageHeader } from "@/components/admin/page-header";
import { PriceForm } from "@/components/admin/price-form";
import { ProductForm } from "@/components/admin/product-form";
import { VariantForm } from "@/components/admin/variant-form";
import { StatusButton } from "@/components/admin/status-button";
import { splitCategoryAttributes } from "@/lib/admin/attribute-specs";
import { deleteProductAction } from "@/lib/admin/products";
import { deleteVariantAction, setVariantStatusAction } from "@/lib/admin/variants";
import { getCategory, listAttributes, listBrands } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/errors";
import { getInventoryLevels } from "@/lib/api/inventory";
import { listMedia } from "@/lib/api/media";
import { getProduct, listVariants } from "@/lib/api/products";
import type {
  Attribute,
  InventoryLevel,
  Product,
  ProductVariant,
} from "@/lib/api/types";
import { availableQuantity } from "@/lib/api/types";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";

export default async function ProductDetailPage({
  params,
}: PageProps<"/[lang]/admin/products/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/products/${id}`);

  if (!can(session, PERMISSIONS.productsRead)) {
    return <NoAccess locale={lang} />;
  }

  const product = await getProduct(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  });

  const [category, attributes, brands, variants, media] = await Promise.all([
    getCategory(product.categoryId),
    listAttributes(),
    listBrands(),
    listVariants(product.id),
    // Images are decorative; a media outage must not take the whole page down.
    listMedia("product", product.id).catch(() => []),
  ]);

  const { informational, variantCreating } = splitCategoryAttributes(
    category.categoryAttributes,
    attributes,
  );
  const attributesById = new Map(attributes.map((a) => [a.id, a]));
  const canUpdate = can(session, PERMISSIONS.productsUpdate);
  const canReadInventory = can(session, PERMISSIONS.inventoryRead);

  // The inventory endpoint is per-variant, so this is one call each. Fetched in
  // parallel, and skipped entirely when the role cannot read stock.
  const stockByVariant = new Map<string, InventoryLevel[]>(
    canReadInventory
      ? await Promise.all(
          variants.map(
            async (variant) =>
              [variant.id, await getInventoryLevels(variant.id).catch(() => [])] as const,
          ),
        )
      : [],
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: `/${lang}/admin/products`, label: dict.admin.products.title }}
        title={product.name}
        // Only this one category was fetched, so there is no chain to build a
        // breadcrumb from — its own name is the honest answer.
        subtitle={`${dict.admin.products.category}: ${category.name}`}
        action={
          <Badge tone={product.status === "PUBLISHED" ? "success" : "neutral"}>
            {dict.admin.products.statuses[product.status]}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <section className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-4 font-medium">{dict.admin.products.editTitle}</h2>

            {/* `products.read` is enough to view this page, but an editable form
                the backend would only 403 is worse than none. */}
            {canUpdate ? (
              <ProductForm
                product={product}
                categoryId={product.categoryId}
                type={product.type}
                brands={brands}
                attributeSpecs={informational}
              />
            ) : (
              <ReadOnlyProduct
                product={product}
                dict={dict}
                brandName={brands.find((brand) => brand.id === product.brandId)?.name}
              />
            )}

            {can(session, PERMISSIONS.productsDelete) ? (
              <div className="border-border mt-4 border-t pt-4">
                <ConfirmButton
                  action={deleteProductAction.bind(null, lang, product.id)}
                  label={dict.admin.actions.delete}
                  pendingLabel={dict.admin.actions.deleting}
                />
              </div>
            ) : null}
          </Card>
        </section>

        <section className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-4 font-medium">{dict.admin.media.title}</h2>
            <MediaManager
              entityType="product"
              entityId={product.id}
              media={media}
              revalidate={`/${lang}/admin/products/${product.id}`}
              canManage={can(session, PERMISSIONS.mediaManage)}
            />
          </Card>

          <Card>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-medium">{dict.admin.variants.title}</h2>
              {/* A simple product owns exactly one implicit variant, so there is
                  nothing to add — hence the notice below instead. */}
              {product.type === "VARIABLE" && canUpdate ? (
                <NewItemDialog label={dict.admin.variants.newTitle}>
                  <VariantForm
                    productId={product.id}
                    variantAttributes={variantCreating}
                  />
                </NewItemDialog>
              ) : null}
            </div>
            <p className="text-muted mb-4 text-sm">{dict.admin.variants.subtitle}</p>

            {variants.length === 0 ? (
              <p className="text-muted text-sm">{dict.admin.empty}</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {variants.map((variant) => (
                  <VariantCard
                    key={variant.id}
                    variant={variant}
                    productId={product.id}
                    locale={lang}
                    dict={dict}
                    attributesById={attributesById}
                    canUpdate={canUpdate}
                    canDelete={can(session, PERMISSIONS.productsDelete)}
                    canPrice={can(session, PERMISSIONS.pricesUpdate)}
                    stock={canReadInventory ? (stockByVariant.get(variant.id) ?? []) : null}
                  />
                ))}
              </ul>
            )}
          </Card>

          {can(session, PERMISSIONS.pricesUpdate) && variants.length > 1 ? (
            <Card>
              <h2 className="mb-4 font-medium">{dict.admin.prices.bulkTitle}</h2>
              <BulkPriceForm productId={product.id} variants={variants} />
            </Card>
          ) : null}

          {product.type === "VARIABLE" ? null : (
            <p className="text-muted text-sm">{dict.admin.variants.simpleNotice}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function ReadOnlyProduct({
  product,
  dict,
  brandName,
}: {
  product: Product;
  dict: Dictionary;
  brandName?: string;
}) {
  const rows: Array<[string, string]> = [
    [dict.admin.fields.name, product.name],
    [dict.admin.fields.slug, product.slug],
    [dict.admin.products.brand, brandName ?? dict.admin.products.noBrand],
    [dict.admin.products.sellingUnit, dict.admin.products.units[product.sellingUnit]],
    [dict.admin.products.minOrderQuantity, String(product.minOrderQuantity)],
    [dict.admin.products.status, dict.admin.products.statuses[product.status]],
  ];

  return (
    <dl className="border-border divide-border divide-y rounded-2xl border">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 p-3">
          <dt className="text-muted text-sm">{label}</dt>
          <dd className="text-sm font-medium">{value}</dd>
        </div>
      ))}
      {product.description ? (
        <p className="text-muted p-3 text-sm">{product.description}</p>
      ) : null}
    </dl>
  );
}

function VariantCard({
  variant,
  productId,
  locale,
  dict,
  attributesById,
  canUpdate,
  canDelete,
  canPrice,
  stock,
}: {
  variant: ProductVariant;
  productId: string;
  locale: Locale;
  dict: Dictionary;
  attributesById: Map<string, Attribute>;
  canUpdate: boolean;
  canDelete: boolean;
  canPrice: boolean;
  /** `null` when the role cannot read inventory. */
  stock: InventoryLevel[] | null;
}) {
  const nextStatus = variant.status === "ACTIVE" ? "DISABLED" : "ACTIVE";

  // Summed across warehouses: the UI has no warehouse picker yet, and orders
  // draw from the first active one regardless.
  const onHand = stock?.reduce((total, level) => total + level.quantityOnHand, 0) ?? 0;
  const available = stock?.reduce((total, level) => total + availableQuantity(level), 0) ?? 0;

  return (
    <li className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-sm">{variant.sku}</span>
        <Badge tone={variant.status === "ACTIVE" ? "success" : "neutral"}>
          {dict.admin.variants.statuses[variant.status]}
        </Badge>
      </div>

      {variant.attributeValues.length > 0 ? (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {variant.attributeValues.map((value) => (
            <div key={value.attributeId} className="flex gap-1">
              <dt className="text-muted">
                {attributesById.get(value.attributeId)?.name ?? value.attributeId}:
              </dt>
              <dd className="font-medium">{value.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {stock ? (
        <Link
          href={`/${locale}/admin/products/${productId}/variants/${variant.id}`}
          className="border-border hover:bg-surface flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs transition"
        >
          <span className="font-medium">{dict.admin.inventory.viewInventory}</span>
          <span className="flex gap-3">
            <span className="text-muted">
              {dict.admin.inventory.onHand}: {onHand}
            </span>
            <span className={available > 0 ? "text-success" : "text-danger"}>
              {dict.admin.inventory.available}: {available}
            </span>
          </span>
        </Link>
      ) : null}

      {/* Whether the variants endpoint embeds prices is not pinned down by the
          contract, so show them when present and always offer the upsert form. */}
      {variant.prices?.length ? (
        <ul className="flex flex-wrap gap-2 text-xs">
          {variant.prices.map((price) => (
            <li key={price.priceListKey}>
              <Badge>
                {price.priceListKey}: {price.amount}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      {canPrice ? (
        <div className="border-border border-t pt-3">
          <p className="mb-2 text-xs font-medium">{dict.admin.prices.title}</p>
          <PriceForm productId={productId} variantId={variant.id} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canUpdate ? (
          <StatusButton
            action={setVariantStatusAction.bind(
              null,
              locale,
              productId,
              variant.id,
              nextStatus,
            )}
            label={
              nextStatus === "ACTIVE"
                ? dict.admin.variants.activate
                : dict.admin.variants.deactivate
            }
            pendingLabel={dict.admin.actions.saving}
          />
        ) : null}
        {canDelete ? (
          <ConfirmButton
            action={deleteVariantAction.bind(null, locale, productId, variant.id)}
            label={dict.admin.actions.delete}
            pendingLabel={dict.admin.actions.deleting}
          />
        ) : null}
      </div>
    </li>
  );
}
