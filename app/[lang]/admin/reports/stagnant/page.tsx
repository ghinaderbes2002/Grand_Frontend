import Link from "next/link";
import { notFound } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getStagnantProducts } from "@/lib/api/reports";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { controlClass } from "@/components/ui/control";

export default async function StagnantProductsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/admin/reports/stagnant">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/reports/stagnant`);

  if (!can(session, PERMISSIONS.reportsView)) {
    return <NoAccess locale={lang} />;
  }

  const { days } = await searchParams;
  const parsed = typeof days === "string" ? Number(days) : NaN;
  const value = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;

  const products = await getStagnantProducts(value);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: `/${lang}/admin/reports`, label: dict.admin.reports.title }}
        title={dict.admin.reports.stagnant}
        subtitle={dict.admin.reports.stagnantSubtitle}
      />

      <form
        method="get"
        className="border-border bg-surface/40 flex flex-wrap items-end gap-3 rounded-2xl border p-4"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          {dict.admin.reports.days}
          <input
            name="days"
            type="number"
            min={1}
            defaultValue={value ?? 30}
            className={controlClass({ className: "w-28" })}
          />
        </label>
        <Button type="submit">
          {dict.admin.filters.apply}
        </Button>
      </form>

      {products.length === 0 ? (
        <p className="text-muted text-sm">{dict.admin.reports.noStagnant}</p>
      ) : (
        <ul className="border-border divide-border divide-y rounded-2xl border">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/${lang}/admin/products/${product.id}`}
                className="hover:bg-surface flex items-center justify-between gap-3 px-4 py-3 transition"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{product.name}</span>
                  <span className="text-muted font-mono text-xs">{product.slug}</span>
                </span>
                <span className="text-muted text-xs">
                  {dict.admin.reports.lastOrdered}:{" "}
                  {product.lastOrderedAt
                    ? formatDateTime(product.lastOrderedAt, lang)
                    : dict.admin.reports.never}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
