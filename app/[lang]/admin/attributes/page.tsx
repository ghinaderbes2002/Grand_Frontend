import Link from "next/link";
import { notFound } from "next/navigation";

import { AttributeForm } from "@/components/admin/attribute-form";
import { DataTable, Td, Th, Tr } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { NewItemDialog } from "@/components/admin/new-item-dialog";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader } from "@/components/admin/page-header";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title={dict.admin.attributes.title}
        subtitle={dict.admin.attributes.subtitle}
        action={
          <NewItemDialog label={dict.admin.attributes.newTitle}>
            <AttributeForm />
          </NewItemDialog>
        }
      />

      <section>
        {attributes.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.empty}</p>
        ) : (
          <DataTable
            head={
              <>
                <Th>{dict.admin.fields.name}</Th>
                <Th>{dict.admin.attributes.key}</Th>
                <Th>{dict.admin.attributes.type}</Th>
                <Th>{dict.admin.attributes.options}</Th>
              </>
            }
          >
            {attributes.map((attribute) => (
              <Tr key={attribute.id}>
                <Td>
                  <Link
                    href={`/${lang}/admin/attributes/${attribute.id}`}
                    className="font-medium hover:underline"
                  >
                    {attribute.name}
                  </Link>
                </Td>
                <Td className="text-muted font-mono text-xs">{attribute.key}</Td>
                <Td>
                  <Badge>{dict.admin.attributes.types[attribute.type]}</Badge>
                </Td>
                {/* An em dash rather than a zero: the types that take no options
                    have none to count, which is not the same as having none. */}
                <Td className="text-muted text-xs">
                  {attribute.options?.length ? attribute.options.length : "—"}
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}
