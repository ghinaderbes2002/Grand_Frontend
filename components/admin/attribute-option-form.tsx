"use client";

import { useActionState } from "react";

import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SubmitButton } from "@/components/ui/submit-button";
import { addAttributeOptionAction } from "@/lib/admin/attributes";
import type { Uuid } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function AttributeOptionForm({ attributeId }: { attributeId: Uuid }) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    addAttributeOptionAction.bind(null, locale, attributeId),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <Field
        name="value"
        label={dict.admin.attributes.optionValue}
        hint={dict.admin.attributes.optionsHint}
        required
        errors={translateFieldErrors(dict, state, "value")}
      />
      <Field
        name="label"
        label={dict.admin.attributes.optionLabel}
        required
        errors={translateFieldErrors(dict, state, "label")}
      />
      <Field
        name="sortOrder"
        type="number"
        label={dict.admin.fields.sortOrder}
        defaultValue={0}
        errors={translateFieldErrors(dict, state, "sortOrder")}
      />

      <SubmitButton
        label={dict.admin.attributes.addOption}
        pendingLabel={dict.admin.actions.creating}
      />
    </form>
  );
}
