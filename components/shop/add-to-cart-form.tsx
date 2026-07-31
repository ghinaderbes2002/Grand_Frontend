"use client";

import { useActionState } from "react";

import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SubmitButton } from "@/components/ui/submit-button";
import type { SellingUnit, Uuid } from "@/lib/api/types";
import { INTEGER_ONLY_UNITS } from "@/lib/api/types";
import { addToCartAction } from "@/lib/shop/cart";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function AddToCartForm({
  variantId,
  sellingUnit,
  minOrderQuantity,
  disabled = false,
}: {
  variantId: Uuid;
  sellingUnit: SellingUnit;
  minOrderQuantity: number;
  disabled?: boolean;
}) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    addToCartAction.bind(null, locale, variantId),
    idleFormState,
  );

  // Whole-unit products reject fractional quantities server-side; matching the
  // input's step keeps the browser from offering one in the first place.
  const wholeOnly = INTEGER_ONLY_UNITS.includes(sellingUnit);

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.shop.addToCart} />

      <Field
        name="quantity"
        type="number"
        step={wholeOnly ? 1 : "any"}
        min={minOrderQuantity}
        defaultValue={minOrderQuantity}
        label={dict.cart.quantity}
        hint={`${dict.shop.minOrder}: ${minOrderQuantity} ${dict.admin.products.units[sellingUnit]}`}
        required
        disabled={disabled}
        errors={translateFieldErrors(dict, state, "quantity")}
      />

      {disabled ? (
        <p className="text-muted text-sm">{dict.shop.outOfStock}</p>
      ) : (
        <SubmitButton label={dict.shop.addToCart} pendingLabel={dict.shop.adding} />
      )}
    </form>
  );
}
