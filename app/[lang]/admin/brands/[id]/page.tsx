import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandForm } from "@/components/admin/brand-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { MediaManager } from "@/components/admin/media-manager";
import { NoAccess } from "@/components/admin/no-access";
import { deleteBrandAction } from "@/lib/admin/brands";
import { getBrand } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/errors";
import { listMedia } from "@/lib/api/media";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function BrandDetailPage({
  params,
}: PageProps<"/[lang]/admin/brands/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/brands/${id}`);

  if (!can(session, PERMISSIONS.productsUpdate)) {
    return <NoAccess locale={lang} />;
  }

  const brand = await getBrand(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  });

  // Images are decorative; a media outage must not take the whole page down.
  const media = await listMedia("brand", brand.id).catch(() => []);

  return (
    <div className="flex max-w-md flex-col gap-6">
      <Link href={`/${lang}/admin/brands`} className="text-muted hover:text-foreground text-sm">
        ← {dict.admin.brands.title}
      </Link>

      <h2 className="text-lg font-medium">{dict.admin.brands.editTitle}</h2>
      <BrandForm brand={brand} />

      <div className="border-border rounded-xl border p-5">
        <h2 className="mb-4 font-medium">{dict.admin.media.title}</h2>
        <MediaManager
          entityType="brand"
          entityId={brand.id}
          media={media}
          revalidate={`/${lang}/admin/brands/${brand.id}`}
          canManage={can(session, PERMISSIONS.mediaManage)}
        />
      </div>

      {can(session, PERMISSIONS.productsDelete) ? (
        <div className="border-border border-t pt-4">
          <ConfirmButton
            action={deleteBrandAction.bind(null, lang, brand.id)}
            label={dict.admin.actions.delete}
            pendingLabel={dict.admin.actions.deleting}
          />
        </div>
      ) : null}
    </div>
  );
}
