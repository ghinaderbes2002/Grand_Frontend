"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import { requireSession } from "@/lib/auth/session";
import { describeApiError } from "@/lib/forms/api-error";
import { text } from "@/lib/forms/fields";
import { errorState, fieldErrorState, type FormState } from "@/lib/forms/state";
import type { Locale } from "@/lib/i18n/config";
import { customerPriceListSchema } from "./schemas";

/**
 * Puts a customer on a specific price list, or clears the override.
 *
 * The customer id has to be supplied by hand: the contract exposes no endpoint
 * that lists customers, and an order does not say who placed it, so there is
 * nothing to pick from. See `app/[lang]/admin/customers/page.tsx`.
 */
export async function setCustomerPriceListAction(
  locale: Locale,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = customerPriceListSchema.safeParse({
    customerId: formData.get("customerId"),
    priceListKey: text(formData, "priceListKey"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<unknown>(`/customers/${parsed.data.customerId}/price-list`, {
      method: "PATCH",
      // An explicit null is what returns the customer to retail; omitting the
      // field would leave the existing override in place.
      body: { priceListKey: parsed.data.priceListKey ?? null },
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  revalidatePath(`/${locale}/admin/customers`);
  return { status: "success" };
}
