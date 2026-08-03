import type { Category, Uuid } from "@/lib/api/types";

/** What separates the levels of a breadcrumb, e.g. `Inks › Eco ink`. */
const SEPARATOR = " › ";

/**
 * Readable breadcrumbs for a flat category listing.
 *
 * `Category.path` looks like a breadcrumb but is not one — the API fills it
 * with a materialised path it sorts by, and the live backend puts **ids** in
 * it (`/7e447625-…/`). Rendering it put raw UUIDs in front of customers. The
 * names are derivable from `parentId`, so they are derived here rather than
 * trusted to a field whose contents the contract never pins down.
 */
export function categoryLabels(categories: Category[]): Map<Uuid, string> {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const labels = new Map<Uuid, string>();

  for (const category of categories) {
    const chain: string[] = [];
    // A parent missing from the listing (or a cycle in the data) must not spin
    // forever — walking stops and the breadcrumb is simply shorter.
    const seen = new Set<Uuid>();

    let node: Category | undefined = category;
    while (node && !seen.has(node.id)) {
      seen.add(node.id);
      chain.unshift(node.name);
      node = node.parentId ? byId.get(node.parentId) : undefined;
    }

    labels.set(category.id, chain.join(SEPARATOR));
  }

  return labels;
}

/**
 * The same list, ready for a `<select>` — sorted so children follow their
 * parent, since the API's own ordering is by a path we no longer read.
 */
export function categoryOptions(categories: Category[]) {
  const labels = categoryLabels(categories);

  return categories
    .map((category) => ({
      id: category.id,
      label: labels.get(category.id) ?? category.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
