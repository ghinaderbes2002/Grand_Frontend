import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartForm } from "@/components/shop/add-to-cart-form";
import { RemoteImage } from "@/components/ui/remote-image";
import { ApiError } from "@/lib/api/errors";
import { listMedia } from "@/lib/api/media";
import { getProductBySlug } from "@/lib/api/products";
import { getSessionOrNull } from "@/lib/auth/session";
import { formatAmount } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * Product pages are the storefront's search-engine surface, so they carry their
 * own title, description and share image. The reads here are `cache`d, so this
 * shares its fetches with the page body rather than doubling them.
 */
export async function generateMetadata({
  params,
}: PageProps<"/[lang]/shop/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};

  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return {};

  const media = await listMedia("product", product.id).catch(() => []);
  const description = product.description?.slice(0, 160);

  return {
    title: product.name,
    description,
    alternates: { canonical: `/${lang}/shop/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      locale: lang,
      images: media[0] ? [{ url: media[0].url, alt: product.name }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/[lang]/shop/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);

  // Public endpoint: 404s for anything not PUBLISHED.
  const product = await getProductBySlug(slug).catch((error: unknown) => {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  });

  const [media, session] = await Promise.all([
    listMedia("product", product.id).catch(() => []),
    getSessionOrNull(),
  ]);

  const variants = product.variants ?? [];
  const sellable = variants.filter((variant) => variant.status === "ACTIVE");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8">
      <Link href={`/${lang}/shop`} className="text-muted hover:text-foreground text-sm">
        ← {dict.shop.backToShop}
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="border-border bg-surface relative aspect-square w-full overflow-hidden rounded-xl border">
            {media[0] ? (
              <RemoteImage
                src={media[0].url}
                alt={product.name}
                sizes="(min-width: 768px) 32rem, 90vw"
                // The largest image above the fold; worth loading eagerly.
                priority
              />
            ) : null}
          </div>

          {media.length > 1 ? (
            <ul className="grid grid-cols-4 gap-2">
              {media.slice(1).map((item) => (
                <li
                  key={item.id}
                  className="border-border bg-surface relative aspect-square overflow-hidden rounded-lg border"
                >
                  <RemoteImage src={item.url} alt="" sizes="8rem" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold">{product.name}</h1>

          <p className="text-lg">
            {product.displayPrice
              ? product.displayPrice.min === product.displayPrice.max
                ? formatAmount(product.displayPrice.min, lang)
                : `${formatAmount(product.displayPrice.min, lang)} – ${formatAmount(product.displayPrice.max, lang)}`
              : dict.shop.unavailable}
          </p>

          {product.description ? (
            <p className="text-muted text-sm whitespace-pre-line">{product.description}</p>
          ) : null}

          {!session ? (
            <Link
              href={`/${lang}/login?next=${encodeURIComponent(`/${lang}/shop/${slug}`)}`}
              className="text-accent text-sm hover:underline"
            >
              {dict.nav.login}
            </Link>
          ) : sellable.length === 0 ? (
            <p className="text-muted text-sm">{dict.shop.unavailable}</p>
          ) : (
            <div className="flex flex-col gap-5">
              {sellable.length > 1 ? (
                <p className="text-muted text-sm">{dict.shop.chooseVariant}</p>
              ) : null}

              {sellable.map((variant) => (
                <div
                  key={variant.id}
                  className="border-border flex flex-col gap-3 rounded-xl border p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-xs">{variant.sku}</span>
                    {variant.attributeValues.length > 0 ? (
                      <span className="text-muted text-xs">
                        {variant.attributeValues.map((value) => value.value).join(" · ")}
                      </span>
                    ) : null}
                  </div>

                  <AddToCartForm
                    variantId={variant.id}
                    sellingUnit={product.sellingUnit}
                    minOrderQuantity={product.minOrderQuantity}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
