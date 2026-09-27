import { notFound } from "next/navigation";

import { BrandForm } from "@/components/admin/brand-form";
import { AdminSearch } from "@/components/admin/admin-search";
import { DataTable, Td, Th, Tr } from "@/components/admin/data-table";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { MediaManager } from "@/components/admin/media-manager";
import { EditItemDialog, NewItemDialog } from "@/components/admin/new-item-dialog";
import { Badge } from "@/components/ui/badge";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader } from "@/components/admin/page-header";
import { deleteBrandAction } from "@/lib/admin/brands";
import { listBrands } from "@/lib/api/catalog";
import { listMedia } from "@/lib/api/media";
import { matchesQuery, readQuery } from "@/lib/admin/search";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function BrandsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/admin/brands">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/brands`);

  if (!can(session, PERMISSIONS.productsCreate)) {
    return <NoAccess locale={lang} />;
  }

  const brands = await listBrands();
  const query = readQuery((await searchParams).q);
  const shown = brands.filter((brand) => matchesQuery(query, brand.name, brand.slug));

  // Each row edits in a dialog, images included, so their media is loaded with
  // the list. Decorative: a media outage leaves the dialog without images
  // rather than taking the page down.
  const mediaByBrand = new Map(
    await Promise.all(
      shown.map(
        async (brand) =>
          [brand.id, await listMedia("brand", brand.id).catch(() => [])] as const,
      ),
    ),
  );
  const canEdit = can(session, PERMISSIONS.productsUpdate);
  const canDelete = can(session, PERMISSIONS.productsDelete);
  const canManageMedia = can(session, PERMISSIONS.mediaManage);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={dict.admin.brands.title}
        subtitle={dict.admin.brands.subtitle}
        action={
          <NewItemDialog label={dict.admin.brands.newTitle}>
            <BrandForm />
          </NewItemDialog>
        }
      />

      <AdminSearch />

      <section>
        {brands.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.empty}</p>
        ) : shown.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.filters.noResults}</p>
        ) : (
          <DataTable
            head={
              <>
                <Th>{dict.admin.fields.name}</Th>
                <Th>{dict.admin.fields.slug}</Th>
                <Th>{dict.admin.fields.isActive}</Th>
              </>
            }
          >
            {shown.map((brand) => (
              <Tr key={brand.id}>
                <Td>
                  {canEdit ? (
                    <EditItemDialog
                      label={brand.name}
                      title={dict.admin.brands.editTitle}
                      className={brand.isActive ? "" : "text-muted line-through"}
                    >
                      <BrandForm brand={brand} />

                      <div className="border-border flex flex-col gap-3 border-t pt-4">
                        <h3 className="font-medium">{dict.admin.media.title}</h3>
                        <MediaManager
                          entityType="brand"
                          entityId={brand.id}
                          media={mediaByBrand.get(brand.id) ?? []}
                          revalidate={`/${lang}/admin/brands`}
                          canManage={canManageMedia}
                        />
                      </div>

                      {canDelete ? (
                        <div className="border-border border-t pt-4">
                          <ConfirmButton
                            action={deleteBrandAction.bind(null, lang, brand.id)}
                            label={dict.admin.actions.delete}
                            pendingLabel={dict.admin.actions.deleting}
                          />
                        </div>
                      ) : null}
                    </EditItemDialog>
                  ) : (
                    <span className={brand.isActive ? "font-medium" : "text-muted font-medium line-through"}>
                      {brand.name}
                    </span>
                  )}
                </Td>
                <Td className="text-muted font-mono text-xs">{brand.slug}</Td>
                <Td>
                  {/* The badge only appears for the exception, so a long list of
                      active brands stays quiet. */}
                  {brand.isActive ? (
                    <span className="text-muted text-xs">{dict.common.yes}</span>
                  ) : (
                    <Badge tone="danger">{dict.common.no}</Badge>
                  )}
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}
