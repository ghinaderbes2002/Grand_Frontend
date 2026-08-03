import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/shop/page-shell";
import { ProductCard } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { getCategoryTree } from "@/lib/api/catalog";
import { listMedia } from "@/lib/api/media";
import { listProducts } from "@/lib/api/products";
import { getSessionOrNull } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** How many products the "new arrivals" strip shows. */
const FEATURED_LIMIT = 8;

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);

  // The catalog is decorative on this page: an empty or failing API leaves the
  // hero and the copy standing rather than taking the landing page down.
  const [session, page, tree] = await Promise.all([
    getSessionOrNull(),
    listProducts({ limit: FEATURED_LIMIT }).catch(() => ({
      items: [],
      nextCursor: null,
    })),
    getCategoryTree().catch(() => []),
  ]);

  const images = new Map(
    await Promise.all(
      page.items.map(
        async (product) =>
          [
            product.id,
            (await listMedia("product", product.id).catch(() => []))[0] ?? null,
          ] as const,
      ),
    ),
  );

  const features = [
    { title: dict.home.features.catalogTitle, body: dict.home.features.catalogBody },
    { title: dict.home.features.pricingTitle, body: dict.home.features.pricingBody },
    { title: dict.home.features.trackingTitle, body: dict.home.features.trackingBody },
  ];

  return (
    <PageShell>
      <section className="border-border from-accent/10 relative overflow-hidden rounded-3xl border bg-gradient-to-b to-transparent px-6 py-14 sm:px-10 sm:py-20">
        <div className="flex max-w-2xl flex-col gap-5">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {dict.home.title}
          </h1>
          <p className="text-muted text-lg">{dict.home.subtitle}</p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/${lang}/shop`}>
              <Button className="h-12 px-6">{dict.home.browse}</Button>
            </Link>
            {session ? (
              <Link href={`/${lang}/orders`}>
                <Button variant="ghost" className="h-12 px-6">
                  {dict.admin.orders.myOrders}
                </Button>
              </Link>
            ) : (
              <Link href={`/${lang}/register`}>
                <Button variant="ghost" className="h-12 px-6">
                  {dict.nav.register}
                </Button>
              </Link>
            )}
          </div>

          {session ? (
            <p className="text-muted text-sm">
              {dict.home.signedInAs}{" "}
              <span className="text-foreground font-medium">
                {dict.roles[session.roleKey]}
              </span>
            </p>
          ) : null}
        </div>
      </section>

      {tree.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeader
            title={dict.home.categories}
            href={`/${lang}/shop`}
            label={dict.home.viewAll}
          />
          <ul className="flex flex-wrap gap-2">
            {/* Top level only — the shop page has the full tree in its rail. */}
            {tree.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/${lang}/shop?categoryId=${category.id}`}
                  className="border-border hover:border-accent/50 hover:bg-surface inline-flex rounded-full border px-4 py-2 text-sm transition"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <SectionHeader
          title={dict.home.newArrivals}
          href={`/${lang}/shop`}
          label={dict.home.viewAll}
        />

        {page.items.length === 0 ? (
          <p className="text-muted text-sm">{dict.home.catalogEmpty}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {page.items.map((product) => (
              <li key={product.id}>
                <ProductCard
                  product={product}
                  image={images.get(product.id) ?? null}
                  locale={lang}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="border-border bg-surface/30 flex flex-col gap-2 rounded-2xl border p-5"
          >
            <h2 className="font-medium">{feature.title}</h2>
            <p className="text-muted text-sm">{feature.body}</p>
          </div>
        ))}
      </section>
    </PageShell>
  );
}

function SectionHeader({
  title,
  href,
  label,
}: {
  title: string;
  href: string;
  label: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <Link href={href} className="text-accent text-sm hover:underline">
        {label}
      </Link>
    </div>
  );
}
