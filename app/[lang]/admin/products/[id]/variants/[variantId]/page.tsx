import Link from "next/link";
import { notFound } from "next/navigation";

import { AdjustStockForm, ReceiveStockForm } from "@/components/admin/inventory-forms";
import { MediaManager } from "@/components/admin/media-manager";
import { NoAccess } from "@/components/admin/no-access";
import { ApiError } from "@/lib/api/errors";
import { listMedia } from "@/lib/api/media";
import {
  getInventoryLevels,
  getInventoryMovements,
  listWarehouses,
} from "@/lib/api/inventory";
import { getProduct, getVariant } from "@/lib/api/products";
import { availableQuantity } from "@/lib/api/types";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function VariantInventoryPage({
  params,
}: PageProps<"/[lang]/admin/products/[id]/variants/[variantId]">) {
  const { lang, id, variantId } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const path = `/${lang}/admin/products/${id}/variants/${variantId}`;
  const session = await requireSession(lang, path);

  if (!can(session, PERMISSIONS.inventoryRead)) {
    return <NoAccess locale={lang} />;
  }

  const [product, variant] = await Promise.all([
    getProduct(id).catch(rethrowUnlessMissing),
    getVariant(id, variantId).catch(rethrowUnlessMissing),
  ]);

  const [levels, movements, warehouses, media] = await Promise.all([
    getInventoryLevels(variantId),
    getInventoryMovements(variantId),
    // Only to label warehouse ids; not every role can read this, so degrade
    // to showing the raw id rather than failing the page.
    can(session, PERMISSIONS.warehousesManage) ? listWarehouses() : Promise.resolve([]),
    // Variant-level images: the API supports this entity type, and hanging them
    // here rather than on the product page avoids a fetch per variant there.
    listMedia("product_variant", variantId).catch(() => []),
  ]);

  const warehouseName = (warehouseId: string) =>
    warehouses.find((warehouse) => warehouse.id === warehouseId)?.name ?? warehouseId;

  const canAdjust = can(session, PERMISSIONS.inventoryAdjust);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href={`/${lang}/admin/products/${id}`}
          className="text-muted hover:text-foreground text-sm"
        >
          ← {product.name}
        </Link>
        <h2 className="text-lg font-medium">
          {dict.admin.inventory.title} · <span className="font-mono">{variant.sku}</span>
        </h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {levels.length === 0 ? (
              <p className="text-muted text-sm">{dict.admin.inventory.noStock}</p>
            ) : (
              levels.map((level) => (
                <div
                  key={level.warehouseId}
                  className="border-border flex flex-col gap-3 rounded-xl border p-4"
                >
                  <p className="text-sm font-medium">
                    {warehouseName(level.warehouseId)}
                  </p>
                  <dl className="grid grid-cols-3 gap-3 text-center">
                    <Stat label={dict.admin.inventory.onHand} value={level.quantityOnHand} />
                    <Stat
                      label={dict.admin.inventory.reserved}
                      value={level.quantityReserved}
                    />
                    <Stat
                      label={dict.admin.inventory.available}
                      value={availableQuantity(level)}
                      hint={dict.admin.inventory.availableHint}
                      emphasis
                    />
                  </dl>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-medium">{dict.admin.inventory.movements}</h3>
            {movements.length === 0 ? (
              <p className="text-muted text-sm">{dict.admin.inventory.noMovements}</p>
            ) : (
              <div className="border-border overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="border-border bg-surface/60 border-b">
                    <tr className="text-start">
                      <Th>{dict.admin.inventory.date}</Th>
                      <Th>{dict.admin.products.type}</Th>
                      <Th>{dict.admin.inventory.quantity}</Th>
                      <Th>{dict.admin.inventory.reason}</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {movements.map((movement) => (
                      <tr key={movement.id}>
                        <Td>
                          <time dateTime={movement.createdAt} className="text-muted text-xs">
                            {formatDate(movement.createdAt, lang)}
                          </time>
                        </Td>
                        <Td>{dict.admin.inventory.types[movement.type]}</Td>
                        <Td>{movement.quantity}</Td>
                        <Td>
                          <span className="text-muted">{movement.reason ?? "—"}</span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="border-border rounded-xl border p-5">
            <h3 className="mb-4 font-medium">{dict.admin.media.title}</h3>
            <MediaManager
              entityType="product_variant"
              entityId={variantId}
              media={media}
              revalidate={path}
              canManage={can(session, PERMISSIONS.mediaManage)}
            />
          </div>

          {canAdjust ? (
            <>
              <div className="border-border rounded-xl border p-5">
                <h3 className="mb-1 font-medium">{dict.admin.inventory.receiveTitle}</h3>
                <p className="text-muted mb-4 text-xs">
                  {dict.admin.inventory.receiveHint}
                </p>
                <ReceiveStockForm productId={id} variantId={variantId} />
              </div>

              <div className="border-border rounded-xl border p-5">
                <h3 className="mb-1 font-medium">{dict.admin.inventory.adjustTitle}</h3>
                <p className="text-muted mb-4 text-xs">
                  {dict.admin.inventory.adjustHint}
                </p>
                <AdjustStockForm productId={id} variantId={variantId} />
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function rethrowUnlessMissing(error: unknown): never {
  if (error instanceof ApiError && error.isNotFound) notFound();
  throw error;
}

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function Stat({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: number;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted text-xs" title={hint}>
        {label}
      </dt>
      <dd className={`text-lg ${emphasis ? "text-accent font-semibold" : "font-medium"}`}>
        {value}
      </dd>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-muted px-3 py-2 text-start text-xs font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 text-start">{children}</td>;
}
