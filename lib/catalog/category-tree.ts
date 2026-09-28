import type { Category, Uuid } from "@/lib/api/types";

/**
 * Walking the category hierarchy from the flat listing, by `parentId`.
 *
 * Every walk carries a `seen` set: a parent missing from the listing or a cycle
 * in the data must end the walk, not spin forever.
 */

/** Every category below `id`, at any depth — active ones only. */
export function descendantIds(categories: Category[], id: Uuid): Uuid[] {
  const children = new Map<Uuid, Uuid[]>();
  for (const category of categories) {
    if (!category.parentId || !category.isActive) continue;
    children.set(category.parentId, [...(children.get(category.parentId) ?? []), category.id]);
  }

  const found: Uuid[] = [];
  const seen = new Set<Uuid>([id]);
  const queue = [...(children.get(id) ?? [])];
  while (queue.length > 0) {
    const next = queue.shift()!;
    if (seen.has(next)) continue;
    seen.add(next);
    found.push(next);
    queue.push(...(children.get(next) ?? []));
  }
  return found;
}

/** The chain from the top-level category down to `id`, both included. */
export function pathToRoot(categories: Category[], id: Uuid): Uuid[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const chain: Uuid[] = [];
  const seen = new Set<Uuid>();

  let node = byId.get(id);
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    chain.unshift(node.id);
    node = node.parentId ? byId.get(node.parentId) : undefined;
  }
  return chain;
}
