"use client";

import { useActionState, useState } from "react";

import { useCloseOnSuccess } from "@/components/admin/new-item-dialog";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createCouponAction, updateCouponAction } from "@/lib/admin/coupons";
import type { Coupon, CouponType } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

/** `datetime-local` needs `YYYY-MM-DDTHH:mm`, not a full ISO string. */
function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export function CouponForm({ coupon }: { coupon?: Coupon }) {
  const { locale, dict } = useI18n();
  const isEdit = Boolean(coupon);
  const [type, setType] = useState<CouponType>(coupon?.type ?? "PERCENTAGE");

  const [state, formAction] = useActionState(
    isEdit
      ? updateCouponAction.bind(null, locale, coupon!.id)
      : createCouponAction.bind(null, locale),
    idleFormState,
  );
  useCloseOnSuccess(state);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <Field
        name="code"
        label={dict.admin.coupons.code}
        hint={dict.admin.coupons.codeHint}
        defaultValue={coupon?.code}
        required
        errors={translateFieldErrors(dict, state, "code")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="type"
          label={dict.admin.coupons.type}
          value={type}
          onChange={(event) => setType(event.target.value as CouponType)}
          errors={translateFieldErrors(dict, state, "type")}
          options={[
            { value: "PERCENTAGE", label: dict.admin.coupons.types.PERCENTAGE },
            { value: "FIXED_AMOUNT", label: dict.admin.coupons.types.FIXED_AMOUNT },
          ]}
        />
        <Field
          name="value"
          type="number"
          step="any"
          min={0}
          label={dict.admin.coupons.value}
          // The hint changes with the type, which is why this is controlled.
          hint={
            type === "PERCENTAGE"
              ? dict.admin.coupons.valueHintPercentage
              : dict.admin.coupons.valueHintFixed
          }
          defaultValue={coupon?.value}
          required
          errors={translateFieldErrors(dict, state, "value")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="maxUses"
          type="number"
          min={1}
          label={dict.admin.coupons.maxUses}
          hint={dict.auth.optional}
          defaultValue={coupon?.maxUses ?? ""}
          errors={translateFieldErrors(dict, state, "maxUses")}
        />
        <Field
          name="minOrderTotal"
          type="number"
          step="any"
          min={0}
          label={dict.admin.coupons.minOrderTotal}
          hint={dict.auth.optional}
          defaultValue={coupon?.minOrderTotal ?? ""}
          errors={translateFieldErrors(dict, state, "minOrderTotal")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="startsAt"
          type="datetime-local"
          label={dict.admin.coupons.startsAt}
          hint={dict.auth.optional}
          defaultValue={toLocalInput(coupon?.startsAt)}
          errors={translateFieldErrors(dict, state, "startsAt")}
        />
        <Field
          name="expiresAt"
          type="datetime-local"
          label={dict.admin.coupons.expiresAt}
          hint={dict.auth.optional}
          defaultValue={toLocalInput(coupon?.expiresAt)}
          errors={translateFieldErrors(dict, state, "expiresAt")}
        />
      </div>

      <CheckboxField
        name="isActive"
        label={dict.admin.fields.isActive}
        defaultChecked={coupon?.isActive ?? true}
      />

      <SubmitButton
        label={isEdit ? dict.admin.actions.save : dict.admin.actions.create}
        pendingLabel={isEdit ? dict.admin.actions.saving : dict.admin.actions.creating}
      />
    </form>
  );
}
