"use client";

import { useActionState } from "react";

import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { setPriceAction } from "@/lib/admin/variants";
import type { Uuid } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

/** Upserts one price. The API keys on (variant, price list). */
export function PriceForm({
  productId,
  variantId,
}: {
  productId: Uuid;
  variantId: Uuid;
}) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    setPriceAction.bind(null, locale, productId, variantId),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          name="priceListKey"
          label={dict.admin.prices.priceList}
          defaultValue="retail"
          errors={translateFieldErrors(dict, state, "priceListKey")}
          options={[
            { value: "retail", label: dict.admin.prices.lists.retail },
            { value: "wholesale", label: dict.admin.prices.lists.wholesale },
          ]}
        />
        <Field
          name="amount"
          type="number"
          step="any"
          min={0}
          label={dict.admin.prices.amount}
          required
          errors={translateFieldErrors(dict, state, "amount")}
        />
      </div>

      <SubmitButton
        label={dict.common.save}
        pendingLabel={dict.admin.actions.saving}
      />
    </form>
  );
}
