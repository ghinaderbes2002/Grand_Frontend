"use client";

import { useActionState } from "react";

import { CheckboxField } from "@/components/ui/checkbox-field";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SubmitButton } from "@/components/ui/submit-button";
import { createWarehouseAction, updateWarehouseAction } from "@/lib/admin/inventory";
import type { Warehouse } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function WarehouseForm({ warehouse }: { warehouse?: Warehouse }) {
  const { locale, dict } = useI18n();
  const isEdit = Boolean(warehouse);

  const [state, formAction] = useActionState(
    isEdit
      ? updateWarehouseAction.bind(null, locale, warehouse!.id)
      : createWarehouseAction.bind(null, locale),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      {/* The code identifies the warehouse in stock movements, so the API does
          not allow changing it after creation. */}
      <Field
        name="code"
        label={dict.admin.warehouses.code}
        hint={isEdit ? dict.admin.warehouses.codeImmutable : dict.admin.warehouses.codeHint}
        defaultValue={warehouse?.code}
        readOnly={isEdit}
        disabled={isEdit}
        required={!isEdit}
        errors={translateFieldErrors(dict, state, "code")}
      />
      <Field
        name="name"
        label={dict.admin.fields.name}
        defaultValue={warehouse?.name}
        required
        errors={translateFieldErrors(dict, state, "name")}
      />
      <CheckboxField
        name="isActive"
        label={dict.admin.fields.isActive}
        defaultChecked={warehouse?.isActive ?? true}
      />

      <SubmitButton
        label={isEdit ? dict.admin.actions.save : dict.admin.actions.create}
        pendingLabel={isEdit ? dict.admin.actions.saving : dict.admin.actions.creating}
      />
    </form>
  );
}
