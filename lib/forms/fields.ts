/** Small helpers for pulling typed values out of a `FormData`. */

/** Trimmed string, or `undefined` when the field is blank/absent. */
export function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** An unchecked checkbox is simply absent from the payload, hence the `=== "on"`. */
export function checkbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

/** `undefined` for blank, `NaN` for unparseable — callers validate with zod. */
export function number(formData: FormData, name: string): number | undefined {
  const raw = text(formData, name);
  return raw === undefined ? undefined : Number(raw);
}

/**
 * Attribute value inputs are named `attr__<attributeId>` so a form can carry an
 * arbitrary set of them without the action knowing the category up front.
 */
export const ATTRIBUTE_FIELD_PREFIX = "attr__";

/** Same idea for bulk pricing: one `price__<variantId>` input per variant. */
export const PRICE_FIELD_PREFIX = "price__";

export function attributeValueFields(formData: FormData) {
  const values: Array<{ attributeId: string; value: string }> = [];

  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith(ATTRIBUTE_FIELD_PREFIX) || typeof raw !== "string") continue;

    // A blank optional attribute is left out entirely; the API type-checks each
    // value it receives, and "" is not valid for any attribute type.
    const value = raw.trim();
    if (!value) continue;

    values.push({ attributeId: key.slice(ATTRIBUTE_FIELD_PREFIX.length), value });
  }

  return values;
}

/**
 * Drops `undefined` values. The API validates with a strict whitelist and
 * rejects unknown keys, so payloads must carry only what was actually filled in.
 */
export function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) result[key as keyof T] = value as T[keyof T];
  }
  return result;
}
