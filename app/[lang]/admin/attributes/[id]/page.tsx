import Link from "next/link";
import { notFound } from "next/navigation";

import { AttributeForm } from "@/components/admin/attribute-form";
import { AttributeOptionForm } from "@/components/admin/attribute-option-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { NoAccess } from "@/components/admin/no-access";
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
      <Link
        href={`/${lang}/admin/attributes`}
        className="text-muted hover:text-foreground text-sm"
      >
        ← {dict.admin.attributes.title}
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">{dict.admin.attributes.editTitle}</h2>
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
        </section>

        <section className="flex flex-col gap-6">
          <div className="border-border rounded-xl border p-5">
            <h2 className="mb-1 text-lg font-medium">{dict.admin.attributes.options}</h2>

            {!takesOptions ? (
              <p className="text-muted text-sm">
                {dict.admin.attributes.optionsOnlyForSelect}
              </p>
            ) : attribute.options.length === 0 ? (
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
          </div>

          {takesOptions ? (
            <div className="border-border rounded-xl border p-5">
              <h2 className="mb-4 text-lg font-medium">
                {dict.admin.attributes.addOption}
              </h2>
              <AttributeOptionForm attributeId={attribute.id} />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
