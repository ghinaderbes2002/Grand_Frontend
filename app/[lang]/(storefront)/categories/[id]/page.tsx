import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryRow } from "@/components/shop/category-row";
import { PageShell, ShopPageHeader } from "@/components/shop/page-shell";
import { Button } from "@/components/ui/button";
import { getCategoryTree, listCategories } from "@/lib/api/catalog";
import { listMedia } from "@/lib/api/media";
import type { CategoryTreeNode } from "@/lib/api/types";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** Depth-first search for a node, so any level can be linked to directly. */
function findNode(nodes: CategoryTreeNode[], id: string): CategoryTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const hit = findNode(node.children, id);
    if (hit) return hit;
  }
  return null;
}

export default async function CategoryPage({
  params,
}: PageProps<"/[lang]/categories/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);

  const [tree, flat] = await Promise.all([
    getCategoryTree().catch(() => []),
    listCategories().catch(() => []),
  ]);

  // The tree is the only endpoint that exposes the hierarchy, so the lookup
  // happens here rather than through `GET /categories/:id`.
  const node = findNode(tree, id);
  if (!node || !node.isActive) notFound();

  const byId = new Map(flat.map((category) => [category.id, category]));
  const children = node.children.filter((child) => child.isActive);

  const images = new Map(
    await Promise.all(
      children.map(
        async (child) =>
          [
            child.id,
            (await listMedia("category", child.id).catch(() => []))[0]?.url ?? null,
          ] as const,
      ),
    ),
  );

  return (
    <PageShell>
      <ShopPageHeader
        back={{
          href: `/${lang}/categories`,
          label: dict.categoriesPage.backToCategories,
        }}
        title={node.name}
        subtitle={children.length > 0 ? dict.categoriesPage.subcategories : undefined}
        action={
          <Link href={`/${lang}/shop?categoryId=${node.id}`}>
            <Button size="sm">{dict.categoriesPage.viewProducts}</Button>
          </Link>
        }
      />

      {/* A leaf has nothing to drill into, so the products link above is the
          whole page — say so rather than showing an empty grid. */}
      {children.length === 0 ? (
        <p className="text-muted text-sm">{dict.categoriesPage.empty}</p>
      ) : (
        <ul className="flex flex-col gap-8">
          {children.map((child, index) => {
            const category = byId.get(child.id);
            if (!category) return null;

            const grandchildren = child.children.filter((c) => c.isActive).length;

            return (
              <li key={child.id} className="reveal">
                <CategoryRow
                  category={category}
                  imageUrl={images.get(child.id)}
                  flipped={index % 2 === 1}
                  label={dict.categoriesPage.viewProducts}
                  href={
                    grandchildren > 0
                      ? `/${lang}/categories/${child.id}`
                      : `/${lang}/shop?categoryId=${child.id}`
                  }
                  meta={
                    grandchildren > 0
                      ? `${grandchildren} ${dict.categoriesPage.productCount}`
                      : undefined
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
