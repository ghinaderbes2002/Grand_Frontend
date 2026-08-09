import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryCard } from "@/components/shop/category-card";
import { PageShell, ShopPageHeader } from "@/components/shop/page-shell";
import { getCategoryTree, listCategories } from "@/lib/api/catalog";
import { listMedia } from "@/lib/api/media";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/categories">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const dict = getDictionary(lang);
  return {
    title: dict.categoriesPage.title,
    alternates: { canonical: `/${lang}/categories` },
  };
}

export default async function CategoriesPage({ params }: PageProps<"/[lang]/categories">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);

  // The tree carries the parent/child shape; the flat listing carries
  // `imageUrl`. The boxes need both.
  const [tree, flat] = await Promise.all([
    getCategoryTree().catch(() => []),
    listCategories().catch(() => []),
  ]);

  const byId = new Map(flat.map((category) => [category.id, category]));
  const roots = tree.filter((node) => node.isActive);

  const images = new Map(
    await Promise.all(
      roots.map(
        async (node) =>
          [
            node.id,
            (await listMedia("category", node.id).catch(() => []))[0]?.url ?? null,
          ] as const,
      ),
    ),
  );

  return (
    <PageShell>
      <ShopPageHeader
        title={dict.categoriesPage.title}
        subtitle={dict.categoriesPage.subtitle}
      />

      {roots.length === 0 ? (
        <p className="text-muted text-sm">{dict.categoriesPage.empty}</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {roots.map((node) => {
            const category = byId.get(node.id);
            if (!category) return null;

            const children = node.children.filter((child) => child.isActive).length;

            return (
              <li key={node.id} className="reveal">
                <CategoryCard
                  category={category}
                  locale={lang}
                  imageUrl={images.get(node.id)}
                  // A root with children opens the drill-down; a leaf goes
                  // straight to its products, since there is nothing to drill.
                  href={
                    children > 0
                      ? `/${lang}/categories/${node.id}`
                      : `/${lang}/shop?categoryId=${node.id}`
                  }
                  meta={
                    children > 0
                      ? `${children} ${dict.categoriesPage.productCount}`
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
