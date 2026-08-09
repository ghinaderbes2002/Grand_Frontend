import Link from "next/link";
import { notFound } from "next/navigation";

import { NewItemDialog } from "@/components/admin/new-item-dialog";
import { NoAccess } from "@/components/admin/no-access";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { WarehouseForm } from "@/components/admin/warehouse-form";
import { listWarehouses } from "@/lib/api/inventory";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function WarehousesPage({
  params,
}: PageProps<"/[lang]/admin/warehouses">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/warehouses`);

  if (!can(session, PERMISSIONS.warehousesManage)) {
    return <NoAccess locale={lang} />;
  }

  const warehouses = await listWarehouses();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={dict.admin.warehouses.title}
        subtitle={dict.admin.warehouses.subtitle}
        action={
          <NewItemDialog label={dict.admin.warehouses.newTitle}>
            <WarehouseForm />
          </NewItemDialog>
        }
      />

      <section>
        {warehouses.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.empty}</p>
        ) : (
          <ul className="border-border divide-border divide-y rounded-2xl border">
            {warehouses.map((warehouse) => (
              <li key={warehouse.id}>
                <Link
                  href={`/${lang}/admin/warehouses/${warehouse.id}`}
                  className="hover:bg-surface flex items-center justify-between gap-3 px-4 py-3 transition"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{warehouse.name}</span>
                    <span className="text-muted font-mono text-xs">{warehouse.code}</span>
                  </span>
                  {!warehouse.isActive ? (
                    <Badge tone="danger">{dict.admin.warehouses.inactive}</Badge>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
