import { notFound } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
import { Card, PageHeader } from "@/components/admin/page-header";
import { WarehouseForm } from "@/components/admin/warehouse-form";
import { ApiError } from "@/lib/api/errors";
import { getWarehouse } from "@/lib/api/inventory";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function WarehouseDetailPage({
  params,
}: PageProps<"/[lang]/admin/warehouses/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/warehouses/${id}`);

  if (!can(session, PERMISSIONS.warehousesManage)) {
    return <NoAccess locale={lang} />;
  }

  const warehouse = await getWarehouse(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  });

  return (
    <div className="flex max-w-md flex-col gap-6">
      <PageHeader
        back={{ href: `/${lang}/admin/warehouses`, label: dict.admin.warehouses.title }}
        title={dict.admin.warehouses.editTitle}
      />

      <Card>
        <WarehouseForm warehouse={warehouse} />
      </Card>

      <p className="text-muted text-xs">{dict.admin.warehouses.noDelete}</p>
    </div>
  );
}
