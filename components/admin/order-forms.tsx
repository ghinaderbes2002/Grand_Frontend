"use client";

import { useActionState } from "react";

import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  createShipmentAction,
  refundPaymentAction,
  updateOrderStatusAction,
} from "@/lib/admin/orders";
import type { OrderStatus, Uuid } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function OrderStatusForm({
  orderId,
  options,
}: {
  orderId: Uuid;
  /** Only the transitions legal from the current status. */
  options: OrderStatus[];
}) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    updateOrderStatusAction.bind(null, locale, orderId),
    idleFormState,
  );

  if (options.length === 0) {
    return <p className="text-muted text-sm">{dict.admin.orders.noTransitions}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <SelectField
        name="status"
        label={dict.admin.orders.newStatus}
        errors={translateFieldErrors(dict, state, "status")}
        options={options.map((status) => ({
          value: status,
          label: dict.admin.orders.statuses[status],
        }))}
      />
      <Field
        name="reason"
        label={dict.admin.orders.reason}
        hint={dict.admin.orders.reasonHint}
        errors={translateFieldErrors(dict, state, "reason")}
      />

      <SubmitButton
        label={dict.admin.orders.apply}
        pendingLabel={dict.admin.actions.saving}
      />
    </form>
  );
}

export function ShipmentForm({ orderId }: { orderId: Uuid }) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    createShipmentAction.bind(null, locale, orderId),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <p className="text-muted text-xs">{dict.admin.shipments.createHint}</p>

      <Field
        name="carrier"
        label={dict.admin.shipments.carrier}
        required
        errors={translateFieldErrors(dict, state, "carrier")}
      />
      <Field
        name="trackingNumber"
        label={dict.admin.shipments.trackingNumber}
        required
        errors={translateFieldErrors(dict, state, "trackingNumber")}
      />

      <SubmitButton
        label={dict.admin.shipments.create}
        pendingLabel={dict.admin.actions.creating}
      />
    </form>
  );
}

export function RefundForm({
  paymentId,
  orderId,
}: {
  paymentId: Uuid;
  orderId: Uuid;
}) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    refundPaymentAction.bind(null, locale, paymentId, orderId),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <p className="text-muted text-xs">{dict.admin.payments.refundHint}</p>

      <Field
        name="amount"
        type="number"
        step="any"
        min={0}
        label={dict.admin.payments.refundAmount}
        required
        errors={translateFieldErrors(dict, state, "amount")}
      />
      <Field
        name="reason"
        label={dict.admin.orders.reason}
        errors={translateFieldErrors(dict, state, "reason")}
      />

      <SubmitButton
        label={dict.admin.payments.refund}
        pendingLabel={dict.admin.payments.refunding}
      />
    </form>
  );
}
