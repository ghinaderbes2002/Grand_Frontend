"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { placeOrderAction, previewCouponAction } from "@/lib/shop/cart";
import { formatAmount } from "@/lib/format";
import { idleFormState, type FormState } from "@/lib/forms/state";
import { translateFieldErrors, translateFormError } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";
import { controlClass } from "@/components/ui/control";

export function CheckoutForm({ subtotal }: { subtotal: number }) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    placeOrderAction.bind(null, locale),
    idleFormState,
  );

  // The coupon lives in component state rather than its own form: it has to be
  // submitted together with the address, but checking it must not place the
  // order. Checking never consumes the code — the API does that atomically when
  // the order is created, so the preview can go stale and the server wins.
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<number | null>(null);
  const [couponState, setCouponState] = useState<FormState>(idleFormState);
  const [checking, startChecking] = useTransition();

  function applyCoupon() {
    startChecking(async () => {
      const result = await previewCouponAction(locale, code, subtotal);
      if (result.ok) {
        setDiscount(result.discountAmount);
        setCouponState({ status: "success" });
      } else {
        setDiscount(null);
        setCouponState(result.state);
      }
    });
  }

  const couponError = translateFormError(dict, couponState);

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

      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <label htmlFor="couponCode" className="text-sm font-medium">
          {dict.checkout.coupon.label}
          <span className="text-muted font-normal"> ({dict.auth.optional})</span>
        </label>

        <div className="flex items-start gap-2">
          <input
            id="couponCode"
            name="couponCode"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              // A changed code invalidates whatever was previewed.
              setDiscount(null);
              setCouponState(idleFormState);
            }}
            className={controlClass({ className: "flex-1 uppercase" })}
          />
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            disabled={checking || code.trim() === ""}
            onClick={applyCoupon}
          >
            {checking ? dict.checkout.coupon.applying : dict.checkout.coupon.apply}
          </Button>
        </div>

        {couponError ? (
          <p role="alert" className="text-danger text-sm">
            {couponState.errorKey === "couponUnavailable"
              ? dict.checkout.coupon.invalid
              : couponError}
          </p>
        ) : null}

        {discount !== null ? (
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-success">
              {dict.checkout.coupon.discount}: −{formatAmount(discount, locale)}
            </p>
            <p className="font-medium">
              {dict.checkout.coupon.afterDiscount}:{" "}
              {formatAmount(Math.max(subtotal - discount, 0), locale)}
            </p>
            <p className="text-muted text-xs">{dict.checkout.coupon.note}</p>
          </div>
        ) : null}
      </div>

      <SubmitButton
        label={dict.checkout.placeOrder}
        pendingLabel={dict.checkout.placing}
      />
    </form>
  );
}
