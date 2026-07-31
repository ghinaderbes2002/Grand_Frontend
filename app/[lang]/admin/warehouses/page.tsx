import { notFound } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
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
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">{dict.admin.warehouses.title}</h2>
          <p className="text-muted max-w-xl text-sm">{dict.admin.warehouses.subtitle}</p>
        </header>

        {warehouses.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.empty}</p>
        ) : (
          <ul className="border-border divide-border divide-y rounded-xl border">
            {warehouses.map((warehouse) => (
              <li
                key={warehouse.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{warehouse.name}</span>
                  <span className="text-muted font-mono text-xs">{warehouse.code}</span>
                </span>
                {!warehouse.isActive ? (
                  <span className="border-border text-muted rounded-md border px-2 py-0.5 text-xs">
                    {dict.admin.warehouses.inactive}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-border h-fit rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-medium">{dict.admin.warehouses.newTitle}</h2>
        <WarehouseForm />
      </section>
    </div>
  );
}
