"use client";

import { useActionState } from "react";

import {
  AttributeValueFields,
  type AttributeSpec,
} from "@/components/admin/attribute-value-fields";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SubmitButton } from "@/components/ui/submit-button";
import { createVariantAction } from "@/lib/admin/variants";
import type { Uuid } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function VariantForm({
  productId,
  variantAttributes,
}: {
  productId: Uuid;
  /** The category's variant-creating attributes — all of them, all required. */
  variantAttributes: AttributeSpec[];
}) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    createVariantAction.bind(null, locale, productId),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <Field
        name="sku"
        label={dict.admin.products.sku}
        hint={dict.admin.products.skuHint}
        required
        errors={translateFieldErrors(dict, state, "sku")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="barcode"
          label={dict.admin.products.barcode}
          errors={translateFieldErrors(dict, state, "barcode")}
        />
        <Field
          name="weight"
          type="number"
          step="any"
          min={0}
          label={dict.admin.products.weight}
          errors={translateFieldErrors(dict, state, "weight")}
        />
      </div>

      <fieldset className="border-border flex flex-col gap-4 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">
          {dict.admin.categories.createsVariant}
        </legend>
        <p className="text-muted text-xs">{dict.admin.variants.attributesHint}</p>
        <AttributeValueFields specs={variantAttributes} state={state} />
      </fieldset>

      <SubmitButton
        label={dict.admin.actions.create}
        pendingLabel={dict.admin.actions.creating}
      />
    </form>
  );
}
