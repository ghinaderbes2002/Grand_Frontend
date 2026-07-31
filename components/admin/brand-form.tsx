"use client";

import { useActionState } from "react";

import { CheckboxField } from "@/components/ui/checkbox-field";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SubmitButton } from "@/components/ui/submit-button";
import { createBrandAction, updateBrandAction } from "@/lib/admin/brands";
import type { Brand } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function BrandForm({ brand }: { brand?: Brand }) {
  const { locale, dict } = useI18n();
  const isEdit = Boolean(brand);

  const [state, formAction] = useActionState(
    isEdit
      ? updateBrandAction.bind(null, locale, brand!.id)
      : createBrandAction.bind(null, locale),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <Field
        name="name"
        label={dict.admin.fields.name}
        defaultValue={brand?.name}
        required
        errors={translateFieldErrors(dict, state, "name")}
      />
      <Field
        name="slug"
        label={dict.admin.fields.slug}
        hint={dict.admin.fields.slugHint}
        defaultValue={brand?.slug}
        errors={translateFieldErrors(dict, state, "slug")}
      />
      <CheckboxField
        name="isActive"
        label={dict.admin.fields.isActive}
        defaultChecked={brand?.isActive ?? true}
      />

      <SubmitButton
        label={isEdit ? dict.admin.actions.save : dict.admin.actions.create}
        pendingLabel={isEdit ? dict.admin.actions.saving : dict.admin.actions.creating}
      />
    </form>
  );
}
