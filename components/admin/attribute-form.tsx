"use client";

import { useActionState } from "react";

import { useCloseOnSuccess } from "@/components/admin/new-item-dialog";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createAttributeAction, updateAttributeAction } from "@/lib/admin/attributes";
import type { Attribute, AttributeType } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

const TYPES: AttributeType[] = [
  "TEXT",
  "SELECT",
  "COLOR_SELECT",
  "DECIMAL_UNIT",
  "INTEGER_UNIT",
  "BOOLEAN",
];

export function AttributeForm({ attribute }: { attribute?: Attribute }) {
  const { locale, dict } = useI18n();
  const isEdit = Boolean(attribute);

  const [state, formAction] = useActionState(
    isEdit
      ? updateAttributeAction.bind(null, locale, attribute!.id)
      : createAttributeAction.bind(null, locale),
    idleFormState,
  );
  useCloseOnSuccess(state);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      {/* key and type are fixed once created — the API rejects changing either,
          because product values are already typed against them. */}
      <Field
        name="key"
        label={dict.admin.attributes.key}
        hint={dict.admin.attributes.keyHint}
        defaultValue={attribute?.key}
        readOnly={isEdit}
        disabled={isEdit}
        required={!isEdit}
        errors={translateFieldErrors(dict, state, "key")}
      />

      <SelectField
        name="type"
        label={dict.admin.attributes.type}
        hint={isEdit ? dict.admin.attributes.typeHint : undefined}
        defaultValue={attribute?.type ?? "TEXT"}
        disabled={isEdit}
        errors={translateFieldErrors(dict, state, "type")}
        options={TYPES.map((type) => ({
          value: type,
          label: dict.admin.attributes.types[type],
        }))}
      />

      <Field
        name="name"
        label={dict.admin.fields.name}
        defaultValue={attribute?.name}
        required
        errors={translateFieldErrors(dict, state, "name")}
      />

      <Field
        name="unit"
        label={dict.admin.attributes.unit}
        hint={dict.auth.optional}
        defaultValue={attribute?.unit ?? ""}
        errors={translateFieldErrors(dict, state, "unit")}
      />

      <CheckboxField
        name="isFilterable"
        label={dict.admin.attributes.filterable}
        defaultChecked={attribute?.isFilterable ?? true}
      />

      <SubmitButton
        label={isEdit ? dict.admin.actions.save : dict.admin.actions.create}
        pendingLabel={isEdit ? dict.admin.actions.saving : dict.admin.actions.creating}
      />
    </form>
  );
}
