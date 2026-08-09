"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control";
import { FormError } from "@/components/ui/form-error";
import type { CartItem } from "@/lib/api/types";
import { formatAmount } from "@/lib/format";
import { removeCartItemAction, updateCartItemAction } from "@/lib/shop/cart";
import { idleFormState } from "@/lib/forms/state";
import { useI18n } from "@/lib/i18n/context";

export function CartItemRow({ item }: { item: CartItem }) {
  const { locale, dict } = useI18n();

  const unitPrice =
    item.variant.prices?.find((price) => price.priceListKey === "retail")?.amount ?? null;

  const [updateState, updateAction, updating] = useActionState(
    updateCartItemAction.bind(null, locale, item.id),
    idleFormState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeCartItemAction.bind(null, locale, item.id),
    idleFormState,
  );

  return (
    <li className="border-border bg-surface/40 flex flex-col gap-3 rounded-2xl border p-4">
      <FormError state={updateState} />
      <FormError state={removeState} />

      {/* Name and unit price only render if the cart response embeds them —
          a customer cannot look a product up, `GET /products/:id` needs
          `products.read`. Falls back to the SKU, which is always present. */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex flex-col gap-0.5">
          {item.variant.product?.name ? (
            <Link
              href={`/${locale}/shop/${item.variant.product.slug}`}
              className="font-medium hover:underline"
            >
              {item.variant.product.name}
            </Link>
          ) : null}
          <span className="text-muted font-mono text-xs">{item.variant.sku}</span>
        </span>

        {unitPrice !== null ? (
          <span className="text-sm">
            {formatAmount(unitPrice * item.quantity, locale)}
            <span className="text-muted text-xs">
              {" "}
              ({formatAmount(unitPrice, locale)} × {item.quantity})
            </span>
          </span>
        ) : null}
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
              className={controlClass({ className: "w-24" })}
            />
          </div>
          <Button type="submit" variant="ghost" disabled={updating}>
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
