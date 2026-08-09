import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandForm } from "@/components/admin/brand-form";
import { DataTable, Td, Th, Tr } from "@/components/admin/data-table";
import { NewItemDialog } from "@/components/admin/new-item-dialog";
import { Badge } from "@/components/ui/badge";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader } from "@/components/admin/page-header";
import { listBrands } from "@/lib/api/catalog";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function BrandsPage({ params }: PageProps<"/[lang]/admin/brands">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/brands`);

  if (!can(session, PERMISSIONS.productsCreate)) {
    return <NoAccess locale={lang} />;
  }

  const brands = await listBrands();

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

      <section>
        {brands.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.empty}</p>
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
            {brands.map((brand) => (
              <Tr key={brand.id}>
                <Td>
                  <Link
                    href={`/${lang}/admin/brands/${brand.id}`}
                    className={`font-medium hover:underline ${
                      brand.isActive ? "" : "text-muted line-through"
                    }`}
                  >
                    {brand.name}
                  </Link>
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
