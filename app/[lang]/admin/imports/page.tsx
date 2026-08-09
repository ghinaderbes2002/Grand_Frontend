import Link from "next/link";
import { notFound } from "next/navigation";

import { Th } from "@/components/admin/data-table";
import { ImportUploadForm } from "@/components/admin/import-forms";
import { Badge } from "@/components/ui/badge";
import { NoAccess } from "@/components/admin/no-access";
import { Card, PageHeader } from "@/components/admin/page-header";
import { listImportBatches } from "@/lib/api/imports";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { formatDateTime, shortId } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** The fixed v1 column map, straight from the contract. */
const COLUMNS: Array<{ name: string; required: boolean; key: string }> = [
  { name: "sku", required: true, key: "sku" },
  { name: "productName", required: true, key: "productName" },
  { name: "categorySlug", required: true, key: "categorySlug" },
  { name: "brandSlug", required: false, key: "brandSlug" },
  { name: "price", required: true, key: "price" },
  { name: "sellingUnit", required: false, key: "sellingUnit" },
  { name: "weight", required: false, key: "weight" },
  { name: "attr_<key>", required: false, key: "attr" },
];

const DESCRIPTIONS: Record<string, { ar: string; en: string }> = {
  sku: { ar: "رمز فريد على مستوى النظام كامل", en: "Unique across the whole system" },
  productName: {
    ar: "الصفوف بنفس (categorySlug + productName) بتتجمّع كمتغيرات لنفس المنتج",
    en: "Rows sharing (categorySlug + productName) group into one product's variants",
  },
  categorySlug: { ar: "slug صنف موجود فعليًا", en: "Slug of an existing category" },
  brandSlug: { ar: "slug علامة تجارية موجودة", en: "Slug of an existing brand" },
  price: { ar: "رقم موجب — يُحفظ بقائمة سعر retail", en: "Positive number — saved to the retail price list" },
  sellingUnit: {
    ar: "افتراضي PIECE — أحد الوحدات المسموحة",
    en: "Defaults to PIECE — one of the allowed units",
  },
  weight: { ar: "رقم", en: "Number" },
  attr: {
    ar: "أي عمود يبدأ بـ attr_ يُقرأ كقيمة صفة. الصفات المنشئة لمتغير إلزامية لكل صف.",
    en: "Any attr_-prefixed column is read as an attribute value. Variant-creating attributes are required on every row.",
  },
};

export default async function ImportsPage({ params }: PageProps<"/[lang]/admin/imports">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/imports`);

  if (!can(session, PERMISSIONS.importsManage)) {
    return <NoAccess locale={lang} />;
  }

  const batches = await listImportBatches();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={dict.admin.imports.title} subtitle={dict.admin.imports.subtitle} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">{dict.admin.imports.columns}</h3>
          <p className="text-muted text-xs">{dict.admin.imports.columnsHint}</p>
          <div className="border-border overflow-x-auto rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="border-border bg-surface/60 border-b">
                <tr>
                  <Th>{dict.admin.imports.column}</Th>
                  <Th>{dict.admin.imports.required}</Th>
                  <Th>{dict.admin.imports.description}</Th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {COLUMNS.map((column) => (
                  <tr key={column.name}>
                    <td className="px-3 py-2 font-mono text-xs">{column.name}</td>
                    <td className="px-3 py-2 text-xs">
                      {column.required ? dict.common.yes : dict.common.no}
                    </td>
                    <td className="text-muted px-3 py-2 text-xs">
                      {DESCRIPTIONS[column.key][lang]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-medium">{dict.admin.imports.batches}</h3>
          {batches.length === 0 ? (
            <p className="text-muted text-sm">{dict.admin.imports.noBatches}</p>
          ) : (
            <ul className="border-border divide-border divide-y rounded-2xl border">
              {batches.map((batch) => (
                <li key={batch.id}>
                  <Link
                    href={`/${lang}/admin/imports/${batch.id}`}
                    className="hover:bg-surface flex items-center justify-between gap-3 px-4 py-3 transition"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm">{batch.filename}</span>
                      <span className="text-muted font-mono text-xs">
                        {shortId(batch.id)} · {formatDateTime(batch.createdAt, lang)}
                      </span>
                    </span>
                    <Badge>{dict.admin.imports.statuses[batch.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        </section>

        <Card className="h-fit">
          <h2 className="mb-4 font-medium">{dict.admin.imports.upload}</h2>
          <ImportUploadForm />
        </Card>
      </div>
    </div>
  );
}
