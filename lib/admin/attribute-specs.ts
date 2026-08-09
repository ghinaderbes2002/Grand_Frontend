import type { AttributeSpec } from "@/components/admin/attribute-value-fields";
import type { Attribute, CategoryAttribute } from "@/lib/api/types";

/**
 * Splits a category's attribute links into the two groups the API treats
 * differently:
 *
 * - **informational** — go on the product form; only the ones flagged
 *   `isRequired` must be filled in.
 * - **variantCreating** — go on the variant form, and a variant must cover
 *   *exactly* all of them, so they are required regardless of `isRequired`.
 */
export function splitCategoryAttributes(
  links: CategoryAttribute[],
  attributes: Attribute[],
): { informational: AttributeSpec[]; variantCreating: AttributeSpec[] } {
  const byId = new Map(attributes.map((attribute) => [attribute.id, attribute]));

  const informational: AttributeSpec[] = [];
  const variantCreating: AttributeSpec[] = [];

  const ordered = [...links].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const link of ordered) {
    // The standalone attribute wins over the one embedded in the link: the
    // embedded copy carries no `options`, which would leave every SELECT field
    // with nothing to pick.
    const attribute = byId.get(link.attributeId) ?? link.attribute;
    if (!attribute) continue;

    if (link.createsVariant) {
      variantCreating.push({ attribute, isRequired: true });
    } else {
      informational.push({ attribute, isRequired: link.isRequired });
    }
  }

  return { informational, variantCreating };
}
