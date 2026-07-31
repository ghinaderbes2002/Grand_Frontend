"use client";

import { useActionState } from "react";

import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { placeOrderAction } from "@/lib/shop/cart";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function CheckoutForm() {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    placeOrderAction.bind(null, locale),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />

      <Field
        name="city"
        label={dict.checkout.city}
        autoComplete="address-level2"
        required
        errors={translateFieldErrors(dict, state, "city")}
      />
      <Field
        name="street"
        label={dict.checkout.street}
        autoComplete="street-address"
        required
        errors={translateFieldErrors(dict, state, "street")}
      />

      <SubmitButton
        label={dict.checkout.placeOrder}
        pendingLabel={dict.checkout.placing}
      />
    </form>
  );
}
