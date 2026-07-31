"use client";

import { useActionState } from "react";

import { CheckboxField } from "@/components/ui/checkbox-field";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SubmitButton } from "@/components/ui/submit-button";
import { createWarehouseAction } from "@/lib/admin/inventory";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function WarehouseForm() {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    createWarehouseAction.bind(null, locale),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <Field
        name="code"
        label={dict.admin.warehouses.code}
        hint={dict.admin.warehouses.codeHint}
        required
        errors={translateFieldErrors(dict, state, "code")}
      />
      <Field
        name="name"
        label={dict.admin.fields.name}
        required
        errors={translateFieldErrors(dict, state, "name")}
      />
      <CheckboxField name="isActive" label={dict.admin.fields.isActive} defaultChecked />

      <SubmitButton
        label={dict.admin.actions.create}
        pendingLabel={dict.admin.actions.creating}
      />
    </form>
  );
}
