"use client";

import { useActionState } from "react";

import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { setCustomerPriceListAction } from "@/lib/admin/customers";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function CustomerPriceListForm() {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    setCustomerPriceListAction.bind(null, locale),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <Field
        name="customerId"
        label={dict.admin.customers.customerId}
        hint={dict.admin.customers.customerIdHint}
        required
        errors={translateFieldErrors(dict, state, "customerId")}
      />

      {/* An empty value clears the override and returns them to retail. */}
      <SelectField
        name="priceListKey"
        label={dict.admin.customers.priceList}
        defaultValue=""
        errors={translateFieldErrors(dict, state, "priceListKey")}
        options={[
          { value: "", label: dict.admin.customers.retailDefault },
          { value: "wholesale", label: dict.admin.prices.lists.wholesale },
        ]}
      />

      <SubmitButton
        label={dict.admin.customers.apply}
        pendingLabel={dict.admin.actions.saving}
      />
    </form>
  );
}
