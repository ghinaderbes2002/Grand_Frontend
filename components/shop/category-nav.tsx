import Link from "next/link";

import type { CategoryTreeNode } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * Nested category navigation, built from `GET /categories/tree` — the endpoint
 * the contract describes as ready for nav menus. Selecting one keeps the other
 * filters intact, since they all live in the same query string.
 */
export function CategoryNav({
  tree,
  locale,
  selectedId,
  query,
}: {
  tree: CategoryTreeNode[];
  locale: Locale;
  selectedId?: string;
  /** The current filters, so switching category preserves them. */
  query: URLSearchParams;
}) {
  const dict = getDictionary(locale);

  if (tree.length === 0) return null;

  const href = (categoryId?: string) => {
    const next = new URLSearchParams(query);
    // Attribute filters belong to the previous category, so they are dropped.
    for (const key of [...next.keys()]) {
      if (key.startsWith("attr_") || key === "cursor") next.delete(key);
    }
    if (categoryId) next.set("categoryId", categoryId);
    else next.delete("categoryId");

    const search = next.toString();
    return `/${locale}/shop${search ? `?${search}` : ""}`;
  };

  return (
    <nav aria-label={dict.shop.allCategories} className="flex flex-col gap-1 text-sm">
      <Link
        href={href()}
        aria-current={!selectedId ? "page" : undefined}
        className={`rounded-lg px-3 py-1.5 transition ${
          selectedId ? "text-muted hover:bg-surface hover:text-foreground" : "bg-surface font-medium"
        }`}
      >
        {dict.shop.allCategories}
      </Link>
      {tree.map((node) => (
        <Branch
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          href={href}
        />
      ))}
    </nav>
  );
}

function Branch({
  node,
  depth,
  selectedId,
  href,
}: {
  node: CategoryTreeNode;
  depth: number;
  selectedId?: string;
  href: (categoryId?: string) => string;
}) {
  if (!node.isActive) return null;

  const active = node.id === selectedId;

  return (
    <>
      <Link
        href={href(node.id)}
        aria-current={active ? "page" : undefined}
        // Logical padding so the indent flips with the writing direction.
        style={{ paddingInlineStart: `${12 + depth * 14}px` }}
        className={`rounded-lg py-1.5 pe-3 transition ${
          active
            ? "bg-surface font-medium"
            : "text-muted hover:bg-surface hover:text-foreground"
        }`}
      >
        {node.name}
      </Link>
      {node.children.map((child) => (
        <Branch
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          href={href}
        />
      ))}
    </>
  );
}
