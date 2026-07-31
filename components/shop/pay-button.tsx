"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { FormError } from "@/components/ui/form-error";
import { payOrderAction } from "@/lib/admin/orders";
import type { Uuid } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { useI18n } from "@/lib/i18n/context";

/**
 * The payment provider is a mock: it always succeeds unless failure is asked
 * for. The failure toggle is exposed on purpose — without a real gateway it is
 * the only way to reach the PAYMENT_FAILED branch of the order flow.
 */
export function PayButton({ orderId, path }: { orderId: Uuid; path: string }) {
  const { locale, dict } = useI18n();
  const [simulateFailure, setSimulateFailure] = useState(false);

  const [state, formAction, isPending] = useActionState(
    payOrderAction.bind(null, locale, orderId, simulateFailure, path),
    idleFormState,
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted text-xs">{dict.admin.payments.mockNotice}</p>
      <FormError state={state} />

      <CheckboxField
        name="simulateFailure"
        label={dict.admin.payments.simulateFailure}
        checked={simulateFailure}
        onChange={(event) => setSimulateFailure(event.target.checked)}
      />

      <form action={formAction}>
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending ? dict.admin.payments.paying : dict.admin.payments.pay}
        </Button>
      </form>
    </div>
  );
}
