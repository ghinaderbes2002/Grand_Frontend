import Link from "next/link";

import { RemoteImage } from "@/components/ui/remote-image";
import type { Media, Product } from "@/lib/api/types";
import { formatAmount } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function ProductCard({
  product,
  image,
  locale,
}: {
  product: Product;
  image: Media | null;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  const price = product.displayPrice;

  return (
    <Link
      href={`/${locale}/shop/${product.slug}`}
      className="border-border bg-surface/40 hover:border-accent/50 hover:shadow-raised flex h-full flex-col gap-3 rounded-2xl border p-3 transition"
    >
      <div className="border-border bg-surface relative aspect-square w-full overflow-hidden rounded-xl border">
        {/* Decorative: the product name sits right below it, so an alt would
            only repeat what a screen reader already reads out. */}
        {image ? (
          <RemoteImage
            src={image.url}
            alt=""
            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
          />
        ) : null}

        {/* Availability is a boolean on the listing — the API never exposes
            real quantities to the storefront. */}
        {/* `inset-s-2` is logical, so the badge flips side with the locale. */}
        {!product.inStock ? (
          <span className="bg-background/90 text-danger absolute top-2 inset-s-2 rounded-md px-2 py-1 text-xs font-medium backdrop-blur-sm">
            {dict.shop.outOfStock}
          </span>
        ) : null}
      </div>

      <span className="line-clamp-2 text-sm font-medium">{product.name}</span>

      <span className="mt-auto text-sm font-semibold">
        {price ? (
          price.min === price.max ? (
            formatAmount(price.min, locale)
          ) : (
            <>
              <span className="text-muted text-xs font-normal">{dict.shop.from} </span>
              {formatAmount(price.min, locale)}
            </>
          )
        ) : (
          <span className="text-muted font-normal">{dict.shop.unavailable}</span>
        )}
      </span>
    </Link>
  );
}
