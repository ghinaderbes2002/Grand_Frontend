import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryRow } from "@/components/shop/category-row";
import { PageBanner } from "@/components/shop/page-shell";
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
    description: dict.categoriesPage.subtitle,
    alternates: { canonical: `/${lang}/categories` },
  };
}

export default async function CategoriesPage({ params }: PageProps<"/[lang]/categories">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);

  // The tree carries the parent/child shape; the flat listing carries
  // `imageUrl`. The rows need both.
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
    <>
      {/* The same banner the products page opens with, so the two sections the
          header points at feel like one site. */}
      <PageBanner
        eyebrow={dict.common.appName}
        title={dict.categoriesPage.title}
        subtitle={dict.categoriesPage.subtitle}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-16">
        {roots.length === 0 ? (
          <p className="text-muted text-center text-sm">{dict.categoriesPage.empty}</p>
        ) : (
          <ul className="flex flex-col gap-8">
            {roots.map((node, index) => {
              const category = byId.get(node.id);
              if (!category) return null;

              const children = node.children.filter((child) => child.isActive).length;

              return (
                <li key={node.id} className="reveal">
                  <CategoryRow
                    category={category}
                    imageUrl={images.get(node.id)}
                    flipped={index % 2 === 1}
                    label={dict.categoriesPage.viewProducts}
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
      </div>
    </>
  );
}
