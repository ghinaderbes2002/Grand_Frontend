import Link from "next/link";
import { notFound } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getLowStock } from "@/lib/api/reports";
import { availableQuantity } from "@/lib/api/types";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function LowStockPage({
  params,
  searchParams,
}: PageProps<"/[lang]/admin/reports/low-stock">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/reports/low-stock`);

  if (!can(session, PERMISSIONS.reportsView)) {
    return <NoAccess locale={lang} />;
  }

  const { threshold } = await searchParams;
  const parsed = typeof threshold === "string" ? Number(threshold) : NaN;
  const value = Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;

  // One call for the whole catalogue. `/inventory` takes a single variant, so
  // building this from it would mean a request per variant in the system.
  const rows = await getLowStock(value);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: `/${lang}/admin/reports`, label: dict.admin.reports.title }}
        title={dict.admin.reports.lowStock}
        subtitle={dict.admin.reports.lowStockSubtitle}
      />

      <form
        method="get"
        className="border-border bg-surface/30 flex flex-wrap items-end gap-3 rounded-2xl border p-4"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          {dict.admin.reports.threshold}
          <input
            name="threshold"
            type="number"
            min={0}
            defaultValue={value ?? 5}
            className="border-border bg-background h-10 w-28 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>
        <Button type="submit" className="h-10">
          {dict.admin.filters.apply}
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-success text-sm">{dict.admin.reports.noLowStock}</p>
      ) : (
        <div className="border-border overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="border-border bg-surface/60 border-b">
              <tr>
                <Th>{dict.admin.products.sku}</Th>
                <Th>{dict.admin.inventory.warehouse}</Th>
                <Th>{dict.admin.inventory.onHand}</Th>
                <Th>{dict.admin.inventory.reserved}</Th>
                <Th>{dict.admin.reports.available}</Th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((row) => {
                // The row's own `available` is used when present; otherwise it
                // is derived, since the contract does not pin the shape down.
                const available = row.available ?? availableQuantity(row);

                return (
                  <tr key={`${row.variantId}-${row.warehouseId}`}>
                    <td className="px-3 py-2">
                      {row.productId ? (
                        <Link
                          href={`/${lang}/admin/products/${row.productId}/variants/${row.variantId}`}
                          className="font-mono text-xs hover:underline"
                        >
                          {row.sku ?? row.variantId}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs">
                          {row.sku ?? row.variantId}
                        </span>
                      )}
                      {row.productName ? (
                        <span className="text-muted block text-xs">
                          {row.productName}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-muted px-3 py-2 text-xs">
                      {row.warehouseCode ?? row.warehouseId}
                    </td>
                    <td className="px-3 py-2">{row.quantityOnHand}</td>
                    <td className="px-3 py-2">{row.quantityReserved}</td>
                    <td
                      className={`px-3 py-2 font-semibold ${
                        available > 0 ? "text-foreground" : "text-danger"
                      }`}
                    >
                      {available}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-muted px-3 py-2 text-start text-xs font-medium">{children}</th>;
}
