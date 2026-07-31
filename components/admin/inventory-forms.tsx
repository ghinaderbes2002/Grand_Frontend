"use client";

import { useActionState } from "react";

import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SubmitButton } from "@/components/ui/submit-button";
import { adjustInventoryAction, receiveInventoryAction } from "@/lib/admin/inventory";
import type { Uuid } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

/** Adds stock. Separate from an adjustment because the audit trail differs. */
export function ReceiveStockForm({
  productId,
  variantId,
}: {
  productId: Uuid;
  variantId: Uuid;
}) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    receiveInventoryAction.bind(null, locale, productId, variantId),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <Field
        name="quantity"
        type="number"
        step="any"
        min={0}
        label={dict.admin.inventory.quantity}
        required
        errors={translateFieldErrors(dict, state, "quantity")}
      />
      <Field
        name="reason"
        label={dict.admin.inventory.reason}
        hint={dict.auth.optional}
        errors={translateFieldErrors(dict, state, "reason")}
      />

      <SubmitButton
        label={dict.admin.inventory.receive}
        pendingLabel={dict.admin.actions.saving}
      />
    </form>
  );
}

/** Manual correction; accepts negatives and demands a reason. */
export function AdjustStockForm({
  productId,
  variantId,
}: {
  productId: Uuid;
  variantId: Uuid;
}) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    adjustInventoryAction.bind(null, locale, productId, variantId),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <Field
        name="quantityDelta"
        type="number"
        step="any"
        label={dict.admin.inventory.quantityDelta}
        hint={dict.admin.inventory.quantityDeltaHint}
        required
        errors={translateFieldErrors(dict, state, "quantityDelta")}
      />
      <Field
        name="reason"
        label={dict.admin.inventory.reason}
        required
        errors={translateFieldErrors(dict, state, "reason")}
      />

      <SubmitButton
        label={dict.admin.inventory.adjust}
        pendingLabel={dict.admin.actions.saving}
      />
    </form>
  );
}
