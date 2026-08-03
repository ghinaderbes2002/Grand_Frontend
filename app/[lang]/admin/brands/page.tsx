import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandForm } from "@/components/admin/brand-form";
import { NoAccess } from "@/components/admin/no-access";
import { Card, PageHeader } from "@/components/admin/page-header";
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
      <PageHeader title={dict.admin.brands.title} subtitle={dict.admin.brands.subtitle} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          {brands.length === 0 ? (
            <p className="text-muted text-sm">{dict.admin.empty}</p>
          ) : (
            <ul className="border-border divide-border divide-y rounded-2xl border">
              {brands.map((brand) => (
                <li key={brand.id}>
                  <Link
                    href={`/${lang}/admin/brands/${brand.id}`}
                    className="hover:bg-surface flex items-center justify-between gap-3 px-4 py-3 transition"
                  >
                    <span
                      className={`text-sm ${brand.isActive ? "" : "text-muted line-through"}`}
                    >
                      {brand.name}
                    </span>
                    <span className="text-muted font-mono text-xs">{brand.slug}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Card className="h-fit">
          <h2 className="mb-4 font-medium">{dict.admin.brands.newTitle}</h2>
          <BrandForm />
        </Card>
      </div>
    </div>
  );
}
