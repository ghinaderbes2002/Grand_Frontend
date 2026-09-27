import Link from "next/link";
import { notFound } from "next/navigation";

import { ArcField } from "@/components/brand/arc-field";
import { LogoMark } from "@/components/brand/logo";
import { CategoryCard } from "@/components/shop/category-card";
import { ProductCard } from "@/components/shop/product-card";
import { StoreHero } from "@/components/shop/store-hero";
import { StoreSearch } from "@/components/shop/store-search";
import { buttonClass } from "@/components/ui/button";
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
  const { stats, reach, cta } = dict.home;

  // WhatsApp when the store has one configured, the phone line otherwise — the
  // same two channels the footer offers.
  const contactHref =
    process.env.NEXT_PUBLIC_WHATSAPP_URL ?? `tel:${dict.footer.phone.replace(/\s+/g, "")}`;

  return (
    <>
      <StoreHero
        badge={dict.home.badge}
        title={{
          lead: dict.home.titleLead,
          accent: dict.home.titleAccent,
          tail: dict.home.titleTail,
        }}
        description={dict.home.subtitle}
        primaryCta={{ href: `/${lang}/shop`, label: dict.home.browse }}
        secondaryCta={{ href: `/${lang}/categories`, label: dict.nav.categories }}
        features={HERO_FEATURES.map(([id, title, body]) => ({
          id,
          title: dict.home.features[title],
          body: dict.home.features[body],
        }))}
        stats={[
          { id: "years", value: stats.yearsValue, label: stats.yearsLabel },
          { id: "branches", value: stats.branchesValue, label: stats.branchesLabel },
          { id: "trade", value: stats.tradeValue, label: stats.tradeLabel },
        ]}
      />

      {/* The top padding clears the panel the hero hangs over its own bottom
          edge; it is taller on a phone, where the three promises stack. */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pt-16 pb-24 sm:pt-44">
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
                className={buttonClass({ variant: "ghost", size: "lg", className: "mx-auto" })}
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

      {/* --- reach: the brand book's "where to find Grand" --- */}
      <section className="bg-brand text-brand-foreground relative isolate overflow-hidden">
        <div aria-hidden="true" className="mesh absolute inset-0 -z-10 text-white opacity-[0.12]!" />
        <ArcField className="absolute -top-24 -start-40 -z-10 w-[40rem] text-white/15 rtl:-scale-x-100" />

        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 py-24 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="reveal flex flex-col items-start gap-2">
            <span className="flex items-start text-[clamp(7rem,4rem+14vw,13rem)] leading-[0.85] font-bold tracking-tighter tabular-nums">
              {reach.years}
              <span aria-hidden="true" className="text-navy mt-[0.08em] text-[0.45em]">+</span>
            </span>
            <span className="max-w-xs text-lg font-medium text-white/85">{reach.yearsCaption}</span>
          </div>

          <div className="reveal flex flex-col items-start gap-5">
            <span className="flex items-center gap-3 text-sm font-semibold text-white/80">
              <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-white/70" />
              {reach.eyebrow}
            </span>
            <h2 className="text-title">{reach.title}</h2>
            <p className="text-lede max-w-xl text-white/80">{reach.body}</p>

            <ul className="mt-2 flex flex-wrap gap-2.5">
              {reach.cities.map((city) => (
                <li
                  key={city}
                  className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 py-2 ps-3 pe-4 text-sm font-medium backdrop-blur-sm transition hover:bg-white hover:text-brand-text"
                >
                  <PinIcon />
                  {city}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* --- closing call to action --- */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-24">
        <div className="bg-navy reveal relative isolate overflow-hidden rounded-[2rem] px-8 py-14 text-white sm:px-14 sm:py-16">
          {/* The logo's arcs, whole and at rest in the card's empty half — the
              same device as the hero, so the page opens and closes on it. */}
          <LogoMark
            tone="reversed"
            className="pointer-events-none absolute top-1/2 end-10 -z-10 hidden h-auto w-72 -translate-y-1/2 opacity-90 lg:block xl:end-16 xl:w-80"
          />
          <ArcField className="absolute top-1/2 -end-24 -z-20 hidden w-[36rem] -translate-y-1/2 text-white/[0.06] lg:block" />

          <div className="flex max-w-xl flex-col items-start gap-5">
            <h2 className="text-title">{cta.title}</h2>
            <p className="text-lede text-white/70">{cta.body}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link href={`/${lang}/shop`} className={buttonClass({ variant: "brand", size: "lg" })}>
                {cta.primary}
              </Link>
              <a href={contactHref} className={buttonClass({ variant: "onDark", size: "lg" })}>
                {cta.secondary}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4 opacity-80"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
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
      {/* Flanked by two short rules, one in each brand ink. */}
      <span className="flex items-center gap-3">
        <span aria-hidden="true" className="bg-accent h-0.5 w-6 rounded-full" />
        <span className="text-eyebrow">{eyebrow}</span>
        <span aria-hidden="true" className="bg-brand h-0.5 w-6 rounded-full" />
      </span>
      <h2 className="text-title">{title}</h2>
      <p className="text-muted text-base">{subtitle}</p>
    </div>
  );
}
