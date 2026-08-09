import { notFound } from "next/navigation";

import { AttributeForm } from "@/components/admin/attribute-form";
import { AttributeOptionForm } from "@/components/admin/attribute-option-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { NewItemDialog } from "@/components/admin/new-item-dialog";
import { NoAccess } from "@/components/admin/no-access";
import { Card, PageHeader } from "@/components/admin/page-header";
import {
  deleteAttributeAction,
  deleteAttributeOptionAction,
} from "@/lib/admin/attributes";
import { getAttribute } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/errors";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** Only these types carry a list of allowed values. */
const OPTION_TYPES = new Set(["SELECT", "COLOR_SELECT"]);

export default async function AttributeDetailPage({
  params,
}: PageProps<"/[lang]/admin/attributes/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/attributes/${id}`);

  if (!can(session, PERMISSIONS.attributesUpdate)) {
    return <NoAccess locale={lang} />;
  }

  const attribute = await getAttribute(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  });

  const takesOptions = OPTION_TYPES.has(attribute.type);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: `/${lang}/admin/attributes`, label: dict.admin.attributes.title }}
        title={dict.admin.attributes.editTitle}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="flex flex-col gap-4">
          <Card>
            <AttributeForm attribute={attribute} />

            {can(session, PERMISSIONS.attributesDelete) ? (
              <div className="border-border mt-4 border-t pt-4">
                <ConfirmButton
                  action={deleteAttributeAction.bind(null, lang, attribute.id)}
                  label={dict.admin.actions.delete}
                  pendingLabel={dict.admin.actions.deleting}
                />
              </div>
            ) : null}
          </Card>
        </section>

        <section className="flex flex-col gap-6">
          <Card>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-medium">{dict.admin.attributes.options}</h2>
              {takesOptions ? (
                <NewItemDialog label={dict.admin.attributes.addOption}>
                  <AttributeOptionForm attributeId={attribute.id} />
                </NewItemDialog>
              ) : null}
            </div>

            {!takesOptions ? (
              <p className="text-muted text-sm">
                {dict.admin.attributes.optionsOnlyForSelect}
              </p>
            ) : !attribute.options?.length ? (
              <p className="text-muted text-sm">{dict.admin.attributes.noOptions}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {attribute.options.map((option) => (
                  <li
                    key={option.id}
                    className="border-border flex flex-col gap-2 rounded-lg border p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm">{option.label}</span>
                      <span className="text-muted font-mono text-xs">{option.value}</span>
                    </div>
                    <ConfirmButton
                      action={deleteAttributeOptionAction.bind(
                        null,
                        lang,
                        attribute.id,
                        option.id,
                      )}
                      label={dict.admin.actions.delete}
                      pendingLabel={dict.admin.actions.deleting}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
