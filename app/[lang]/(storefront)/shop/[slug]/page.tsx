import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartForm } from "@/components/shop/add-to-cart-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { ApiError } from "@/lib/api/errors";
import { listMedia } from "@/lib/api/media";
import { getProductBySlug } from "@/lib/api/products";
import { getSessionOrNull } from "@/lib/auth/session";
import { formatAmount } from "@/lib/format";
import { ORDERING_ENABLED } from "@/lib/shop/ordering";
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <Link href={`/${lang}/shop`} className="text-muted hover:text-foreground text-sm">
        <span aria-hidden="true">‹ </span>
        {dict.shop.backToShop}
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="border-border bg-surface relative aspect-square w-full overflow-hidden rounded-2xl border">
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

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <h1 className="animate-fade-in text-title [animation-delay:100ms]">
              {product.name}
            </h1>

            <div className="animate-fade-in flex flex-wrap items-center gap-3 [animation-delay:200ms]">
              <p className="text-2xl font-semibold">
                {product.displayPrice
                  ? product.displayPrice.min === product.displayPrice.max
                    ? formatAmount(product.displayPrice.min, lang)
                    : `${formatAmount(product.displayPrice.min, lang)} – ${formatAmount(product.displayPrice.max, lang)}`
                  : dict.shop.unavailable}
              </p>

              <Badge tone={product.inStock ? "success" : "danger"}>
                {product.inStock ? dict.shop.inStock : dict.shop.outOfStock}
              </Badge>
            </div>

            {product.description ? (
              <p className="animate-fade-in text-muted text-sm whitespace-pre-line [animation-delay:300ms]">
                {product.description}
              </p>
            ) : null}
          </div>

          {/* Ordering is suspended, so the page stops at the specification —
              no buy controls, and no notice about an account either, since
              having one would not help. */}
          {!ORDERING_ENABLED ? null : !session ? (
            /* The cart lives on the server keyed to an account, so there is no
               guest cart to fall back on — say so instead of showing a form
               that would only bounce them to the login. */
            <div className="border-border bg-surface/40 flex flex-col items-start gap-3 rounded-2xl border p-5">
              <p className="font-medium">{dict.shop.loginToBuy}</p>
              <p className="text-muted text-sm">{dict.shop.loginToBuyHint}</p>
              <Link
                href={`/${lang}/login?next=${encodeURIComponent(`/${lang}/shop/${slug}`)}`}
              >
                <Button>{dict.nav.login}</Button>
              </Link>
            </div>
          ) : sellable.length === 0 ? (
            <p className="text-muted text-sm">{dict.shop.unavailable}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {sellable.length > 1 ? (
                <p className="text-muted text-sm">{dict.shop.chooseVariant}</p>
              ) : null}

              {sellable.map((variant) => (
                <div
                  key={variant.id}
                  className="border-border bg-surface/40 flex flex-col gap-3 rounded-2xl border p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    {variant.attributeValues.length > 0 ? (
                      <span className="text-sm font-medium">
                        {variant.attributeValues.map((value) => value.value).join(" · ")}
                      </span>
                    ) : null}
                    <span className="text-muted font-mono text-xs">{variant.sku}</span>
                  </div>

                  <AddToCartForm
                    variantId={variant.id}
                    sellingUnit={product.sellingUnit}
                    minOrderQuantity={product.minOrderQuantity}
                    // Per-variant availability, so a shopper is told before
                    // checkout instead of hitting a 409 at the end.
                    disabled={variant.inStock === false}
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
