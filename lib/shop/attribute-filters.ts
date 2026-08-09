import type { Attribute, CategoryAttribute } from "@/lib/api/types";

/** Query params carrying attribute filters are named `attr_<key>`. */
export const ATTR_QUERY_PREFIX = "attr_";

export type FilterableAttribute = {
  attribute: Attribute;
  /** Current value from the URL, if any. */
  value: string;
};

/**
 * The attributes a category exposes as filters, in the order the category
 * defines. Only `isFilterable` links qualify — the contract points at
 * `GET /category-attributes?categoryId=X` for exactly this.
 */
export function filterableAttributes(
  links: CategoryAttribute[],
  attributes: Attribute[],
  active: Record<string, string>,
): FilterableAttribute[] {
  const byId = new Map(attributes.map((attribute) => [attribute.id, attribute]));

  return [...links]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((link) => link.isFilterable)
    // Preferred over `link.attribute`, which the API sends without `options` —
    // a SELECT filter built from it would have no choices.
    .map((link) => byId.get(link.attributeId) ?? link.attribute)
    .filter((attribute): attribute is Attribute => Boolean(attribute))
    .map((attribute) => ({ attribute, value: active[attribute.key] ?? "" }));
}

/**
 * Pulls `attr_*` params out of a search-params object, keyed by attribute key.
 * Repeated params collapse to the first value: the API ANDs across different
 * attributes, not within one.
 */
export function readAttributeParams(
  query: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [param, raw] of Object.entries(query)) {
    if (!param.startsWith(ATTR_QUERY_PREFIX)) continue;

    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value !== "string" || value === "") continue;

    result[param.slice(ATTR_QUERY_PREFIX.length)] = value;
  }

  return result;
}
