"use client";

import { useActionState } from "react";

import { useCloseOnSuccess } from "@/components/admin/new-item-dialog";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { linkAttributeAction } from "@/lib/admin/categories";
import type { Uuid } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function LinkAttributeForm({
  categoryId,
  available,
}: {
  categoryId: Uuid;
  /** Attributes not yet linked to this category. */
  available: Array<{ id: Uuid; label: string }>;
}) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    linkAttributeAction.bind(null, locale, categoryId),
    idleFormState,
  );
  useCloseOnSuccess(state);

  if (available.length === 0) {
    return <p className="text-muted text-sm">{dict.admin.categories.noAttributesLeft}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <SelectField
        name="attributeId"
        label={dict.admin.categories.linkAttribute}
        errors={translateFieldErrors(dict, state, "attributeId")}
        options={available.map((attribute) => ({
          value: attribute.id,
          label: attribute.label,
        }))}
      />

      <div className="flex flex-col gap-2.5">
        <CheckboxField name="isRequired" label={dict.admin.categories.isRequired} />
        <CheckboxField
          name="isFilterable"
          label={dict.admin.categories.isFilterable}
          defaultChecked
        />
        <CheckboxField
          name="createsVariant"
          label={dict.admin.categories.createsVariant}
          hint={dict.admin.categories.linkedAttributesHint}
        />
      </div>

      <Field
        name="sortOrder"
        type="number"
        label={dict.admin.fields.sortOrder}
        defaultValue={0}
        errors={translateFieldErrors(dict, state, "sortOrder")}
      />

      <SubmitButton
        label={dict.admin.actions.create}
        pendingLabel={dict.admin.actions.creating}
      />
    </form>
  );
}
