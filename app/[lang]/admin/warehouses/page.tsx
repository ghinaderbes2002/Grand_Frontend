import Link from "next/link";
import { notFound } from "next/navigation";

import { DataTable, Td, Th, Tr } from "@/components/admin/data-table";
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
          <DataTable
            head={
              <>
                <Th>{dict.admin.fields.name}</Th>
                <Th>{dict.admin.warehouses.code}</Th>
                <Th>{dict.admin.fields.isActive}</Th>
              </>
            }
          >
            {warehouses.map((warehouse) => (
              <Tr key={warehouse.id}>
                <Td>
                  <Link
                    href={`/${lang}/admin/warehouses/${warehouse.id}`}
                    className="font-medium hover:underline"
                  >
                    {warehouse.name}
                  </Link>
                </Td>
                <Td className="text-muted font-mono text-xs">{warehouse.code}</Td>
                <Td>
                  {warehouse.isActive ? (
                    <span className="text-muted text-xs">{dict.common.yes}</span>
                  ) : (
                    <Badge tone="danger">{dict.admin.warehouses.inactive}</Badge>
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
