"use client";

import { useActionState } from "react";

import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { setPricesBulkAction } from "@/lib/admin/variants";
import type { ProductVariant, Uuid } from "@/lib/api/types";
import { PRICE_FIELD_PREFIX } from "@/lib/forms/fields";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

/** One amount per variant, submitted together via `POST /prices/bulk`. */
export function BulkPriceForm({
  productId,
  variants,
}: {
  productId: Uuid;
  variants: ProductVariant[];
}) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    setPricesBulkAction.bind(null, locale, productId),
    idleFormState,
  );

  const bulkErrors = translateFieldErrors(dict, state, "bulk");

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.prices.bulkUpdated} />

      <p className="text-muted text-xs">{dict.admin.prices.bulkHint}</p>

      <SelectField
        name="priceListKey"
        label={dict.admin.prices.priceList}
        defaultValue="retail"
        options={[
          { value: "retail", label: dict.admin.prices.lists.retail },
          { value: "wholesale", label: dict.admin.prices.lists.wholesale },
        ]}
      />

      <ul className="flex flex-col gap-2">
        {variants.map((variant) => {
          const name = `${PRICE_FIELD_PREFIX}${variant.id}`;
          const errors = translateFieldErrors(dict, state, name);

          return (
            <li key={variant.id} className="flex items-center gap-3">
              <label htmlFor={name} className="flex-1 font-mono text-xs">
                {variant.sku}
              </label>
              <input
                id={name}
                name={name}
                type="number"
                step="any"
                min={0}
                placeholder={dict.admin.prices.amount}
                aria-invalid={errors ? true : undefined}
                className={`bg-background h-10 w-32 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40 ${
                  errors ? "border-danger" : "border-border"
                }`}
              />
            </li>
          );
        })}
      </ul>

      {bulkErrors ? <p className="text-danger text-sm">{bulkErrors.join(" · ")}</p> : null}

      <SubmitButton
        label={dict.admin.prices.bulkSave}
        pendingLabel={dict.admin.actions.saving}
      />
    </form>
  );
}
