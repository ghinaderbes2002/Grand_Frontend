import Link from "next/link";
import { notFound } from "next/navigation";

import { AttributeForm } from "@/components/admin/attribute-form";
import { NoAccess } from "@/components/admin/no-access";
import { listAttributes } from "@/lib/api/catalog";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function AttributesPage({ params }: PageProps<"/[lang]/admin/attributes">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/attributes`);

  if (!can(session, PERMISSIONS.attributesCreate)) {
    return <NoAccess locale={lang} />;
  }

  const attributes = await listAttributes();

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">{dict.admin.attributes.title}</h2>
          <p className="text-muted text-sm">{dict.admin.attributes.subtitle}</p>
        </header>

        {attributes.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.empty}</p>
        ) : (
          <ul className="border-border divide-border divide-y rounded-xl border">
            {attributes.map((attribute) => (
              <li key={attribute.id}>
                <Link
                  href={`/${lang}/admin/attributes/${attribute.id}`}
                  className="hover:bg-surface flex items-center justify-between gap-3 px-4 py-3 transition"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{attribute.name}</span>
                    <span className="text-muted font-mono text-xs">{attribute.key}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    {attribute.options.length > 0 ? (
                      <span className="text-muted">
                        {attribute.options.length} {dict.admin.attributes.options}
                      </span>
                    ) : null}
                    <span className="border-border text-muted rounded-md border px-2 py-0.5">
                      {dict.admin.attributes.types[attribute.type]}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-border h-fit rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-medium">{dict.admin.attributes.newTitle}</h2>
        <AttributeForm />
      </section>
    </div>
  );
}
