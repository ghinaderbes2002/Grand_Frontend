"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import type { CartItem } from "@/lib/api/types";
import { removeCartItemAction, updateCartItemAction } from "@/lib/shop/cart";
import { idleFormState } from "@/lib/forms/state";
import { useI18n } from "@/lib/i18n/context";

export function CartItemRow({ item }: { item: CartItem }) {
  const { locale, dict } = useI18n();

  const [updateState, updateAction, updating] = useActionState(
    updateCartItemAction.bind(null, locale, item.id),
    idleFormState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeCartItemAction.bind(null, locale, item.id),
    idleFormState,
  );

  return (
    <li className="border-border flex flex-col gap-3 rounded-xl border p-4">
      <FormError state={updateState} />
      <FormError state={removeState} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-sm">{item.variant.sku}</span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {/* PATCH replaces the quantity outright — unlike adding, which sums. */}
        <form action={updateAction} className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`qty-${item.id}`} className="text-xs font-medium">
              {dict.cart.quantity}
            </label>
            <input
              id={`qty-${item.id}`}
              name="quantity"
              type="number"
              min={0}
              step="any"
              defaultValue={item.quantity}
              className="border-border bg-background h-10 w-24 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <Button type="submit" variant="ghost" className="h-10" disabled={updating}>
            {dict.cart.update}
          </Button>
        </form>

        <form action={removeAction}>
          <Button
            type="submit"
            variant="ghost"
            className="text-danger h-10"
            disabled={removing}
          >
            {dict.cart.remove}
          </Button>
        </form>
      </div>
    </li>
  );
}
