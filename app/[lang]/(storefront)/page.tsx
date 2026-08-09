import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryCard } from "@/components/shop/category-card";
import { ProductCard } from "@/components/shop/product-card";
import { StoreHero } from "@/components/shop/store-hero";
import { StoreSearch } from "@/components/shop/store-search";
import { listCategories } from "@/lib/api/catalog";
import { listMedia } from "@/lib/api/media";
import { listProducts } from "@/lib/api/products";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** How many products the featured strip shows. */
const FEATURED_LIMIT = 8;

/**
 * The three promises in the panel under the hero, as `[id, titleKey, bodyKey]`.
 * The copy lives in the dictionary; only the order is decided here.
 */
const HERO_FEATURES = [
  ["catalog", "catalogTitle", "catalogBody"],
  ["pricing", "pricingTitle", "pricingBody"],
  ["tracking", "trackingTitle", "trackingBody"],
] as const;

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);

  // The catalog is decorative on this page: an empty or failing API leaves the
  // hero and the copy standing rather than taking the landing page down.
  const [page, categories] = await Promise.all([
    listProducts({ limit: FEATURED_LIMIT }).catch(() => ({
      items: [],
      nextCursor: null,
    })),
    listCategories().catch(() => []),
  ]);

  // The flat listing, not the tree: only `Category` carries `imageUrl`, and the
  // boxes below are built around the image.
  const rootCategories = categories.filter(
    (category) => category.parentId === null && category.isActive,
  );

  // One media call per product and per category — neither listing carries
  // images. They run in parallel and both lists are capped, but a thumbnail on
  // the list response would remove this entirely; it is on the list of asks
  // for the backend.
  const [productImages, categoryImages] = await Promise.all([
    Promise.all(
      page.items.map(
        async (product) =>
          [
            product.id,
            (await listMedia("product", product.id).catch(() => []))[0] ?? null,
          ] as const,
      ),
    ).then((entries) => new Map(entries)),
    Promise.all(
      rootCategories.map(
        async (category) =>
          [
            category.id,
            (await listMedia("category", category.id).catch(() => []))[0]?.url ?? null,
          ] as const,
      ),
    ).then((entries) => new Map(entries)),
  ]);

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <>
      <StoreHero
        badge={dict.home.badge}
        title={dict.home.title}
        description={dict.home.subtitle}
        primaryCta={{ href: `/${lang}/shop`, label: dict.home.browse }}
        secondaryCta={{ href: `/${lang}/categories`, label: dict.nav.categories }}
        features={HERO_FEATURES.map(([id, title, body]) => ({
          id,
          title: dict.home.features[title],
          body: dict.home.features[body],
        }))}
      />

      {/* `pt-36` clears the panel the hero hangs over its own bottom edge. */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pt-36 pb-20">
        {/* --- featured products --- */}
        <section id="featured" className="flex scroll-mt-24 flex-col gap-8">
          <SectionHeading
            eyebrow={dict.home.featured}
            title={dict.home.featuredTitle}
            subtitle={dict.home.featuredSubtitle}
          />

          {/* Directly above the grid: the shopper who knows what they want
              types it here, everyone else scrolls into the products. */}
          <StoreSearch
            action={`/${lang}/shop`}
            label={dict.home.searchLabel}
            placeholder={dict.home.searchPlaceholder}
            submit={dict.home.searchSubmit}
          />

          {page.items.length === 0 ? (
            <p className="text-muted text-center text-sm">{dict.home.catalogEmpty}</p>
          ) : (
            <>
              <ul className="reveal-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {page.items.map((product) => (
                  <li key={product.id}>
                    <ProductCard
                      product={product}
                      image={productImages.get(product.id) ?? null}
                      locale={lang}
                      categoryName={categoryNames.get(product.categoryId)}
                    />
                  </li>
                ))}
              </ul>

              <Link
                href={`/${lang}/shop`}
                className="border-border hover:border-accent hover:text-accent-strong mx-auto inline-flex rounded-full border px-7 py-3 text-sm font-medium transition"
              >
                {dict.home.viewAll}
              </Link>
            </>
          )}
        </section>

        {/* --- categories --- */}
        {rootCategories.length > 0 ? (
          <section id="categories" className="flex scroll-mt-24 flex-col gap-8">
            <SectionHeading
              eyebrow={dict.home.categories}
              title={dict.nav.categories}
              subtitle={dict.home.categoriesSubtitle}
            />

            <ul className="reveal-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {rootCategories.map((category) => (
                <li key={category.id}>
                  <CategoryCard
                    category={category}
                    locale={lang}
                    imageUrl={categoryImages.get(category.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="reveal mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
      <span className="text-eyebrow">{eyebrow}</span>
      <h2 className="text-title">{title}</h2>
      <p className="text-muted text-sm">{subtitle}</p>
    </div>
  );
}
