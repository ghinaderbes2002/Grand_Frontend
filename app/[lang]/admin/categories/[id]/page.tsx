import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/category-form";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { LinkAttributeForm } from "@/components/admin/link-attribute-form";
import { MediaManager } from "@/components/admin/media-manager";
import { NewItemDialog } from "@/components/admin/new-item-dialog";
import { NoAccess } from "@/components/admin/no-access";
import { Card, PageHeader } from "@/components/admin/page-header";
import { deleteCategoryAction, unlinkAttributeAction } from "@/lib/admin/categories";
import { getCategory, listAttributes, listCategories } from "@/lib/api/catalog";
import { categoryLabels, categoryOptions } from "@/lib/catalog/category-labels";
import { ApiError } from "@/lib/api/errors";
import { listMedia } from "@/lib/api/media";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function CategoryDetailPage({
  params,
}: PageProps<"/[lang]/admin/categories/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/categories/${id}`);

  if (!can(session, PERMISSIONS.categoriesUpdate)) {
    return <NoAccess locale={lang} />;
  }

  const category = await getCategory(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  });

  const [flat, attributes, media] = await Promise.all([
    listCategories(),
    listAttributes(),
    // Images are decorative; a media outage must not take the whole page down.
    listMedia("category", category.id).catch(() => []),
  ]);

  const linkedIds = new Set(category.categoryAttributes.map((link) => link.attributeId));
  const attributesById = new Map(attributes.map((attribute) => [attribute.id, attribute]));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: `/${lang}/admin/categories`, label: dict.admin.categories.title }}
        title={dict.admin.categories.editTitle}
        subtitle={`${dict.admin.categories.path}: ${
          categoryLabels(flat).get(category.id) ?? category.name
        }`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="flex flex-col gap-4">
          <Card>
            <CategoryForm
              category={category}
              // A category cannot be its own parent; the API also rejects moving
              // one under its own descendant, which it reports as a 409.
              parentOptions={categoryOptions(
                flat.filter((candidate) => candidate.id !== category.id),
              )}
            />

            {can(session, PERMISSIONS.categoriesDelete) ? (
              <div className="border-border mt-4 border-t pt-4">
                <ConfirmButton
                  action={deleteCategoryAction.bind(null, lang, category.id)}
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
              entityType="category"
              entityId={category.id}
              media={media}
              revalidate={`/${lang}/admin/categories/${category.id}`}
              canManage={can(session, PERMISSIONS.mediaManage)}
            />
          </Card>

          <Card>
            <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-medium">{dict.admin.categories.linkedAttributes}</h2>
              {can(session, PERMISSIONS.attributesUpdate) ? (
                <NewItemDialog label={dict.admin.categories.linkAttribute}>
                  <LinkAttributeForm
                    categoryId={category.id}
                    available={attributes
                      .filter((attribute) => !linkedIds.has(attribute.id))
                      .map((attribute) => ({
                        id: attribute.id,
                        label: `${attribute.name} (${attribute.key})`,
                      }))}
                  />
                </NewItemDialog>
              ) : null}
            </div>
            <p className="text-muted mb-4 text-sm">
              {dict.admin.categories.linkedAttributesHint}
            </p>

            {category.categoryAttributes.length === 0 ? (
              <p className="text-muted text-sm">{dict.admin.empty}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {category.categoryAttributes.map((link) => {
                  // Same order as everywhere else: the standalone attribute is
                  // the complete one, the embedded copy is the fallback.
                  const attribute =
                    attributesById.get(link.attributeId) ?? link.attribute;

                  return (
                    <li
                      key={link.attributeId}
                      className="border-border flex flex-col gap-2 rounded-lg border p-3"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">
                          {attribute?.name ?? link.attributeId}
                        </span>
                        <span className="text-muted font-mono text-xs">
                          {attribute?.key}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {link.createsVariant ? (
                          <Badge tone="accent">
                            {dict.admin.categories.createsVariant}
                          </Badge>
                        ) : null}
                        {link.isRequired ? (
                          <Badge>{dict.admin.categories.isRequired}</Badge>
                        ) : null}
                        {link.isFilterable ? (
                          <Badge>{dict.admin.categories.isFilterable}</Badge>
                        ) : null}
                      </div>

                      {can(session, PERMISSIONS.attributesUpdate) ? (
                        <ConfirmButton
                          action={unlinkAttributeAction.bind(
                            null,
                            lang,
                            category.id,
                            link.attributeId,
                          )}
                          label={dict.admin.categories.unlink}
                          pendingLabel={dict.admin.actions.deleting}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
