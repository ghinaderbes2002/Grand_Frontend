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
  /** Shown as a chip over the image. Omitted when the name is not to hand. */
  categoryName,
}: {
  product: Product;
  image: Media | null;
  locale: Locale;
  categoryName?: string;
}) {
  const dict = getDictionary(locale);
  const price = product.displayPrice;

  return (
    <Link
      href={`/${locale}/shop/${product.slug}`}
      className="border-border bg-surface/40 hover:border-accent/50 hover:shadow-raised group flex h-full flex-col gap-3 rounded-2xl border p-3 transition duration-300 hover:-translate-y-1"
    >
      <div className="border-border bg-surface relative aspect-square w-full overflow-hidden rounded-xl border">
        {/* Decorative: the product name sits right below it, so an alt would
            only repeat what a screen reader already reads out. */}
        {image ? (
          // The slow zoom is what makes the card feel considered rather than
          // static; `prefers-reduced-motion` disables it globally.
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
            <RemoteImage
              src={image.url}
              alt=""
              sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
            />
          </div>
        ) : (
          <div className="halftone absolute inset-0" aria-hidden="true" />
        )}

        {/* `inset-s-*` is logical, so the chips flip side with the locale. */}
        {categoryName ? (
          <span className="bg-background/85 absolute top-3 inset-s-3 rounded-full px-3 py-1 text-[11px] font-medium backdrop-blur-sm">
            {categoryName}
          </span>
        ) : null}

        {/* Availability is a boolean on the listing — the API never exposes
            real quantities to the storefront. */}
        {!product.inStock ? (
          <span className="bg-background/85 text-danger absolute bottom-3 inset-s-3 rounded-full px-3 py-1 text-[11px] font-medium backdrop-blur-sm">
            {dict.shop.outOfStock}
          </span>
        ) : null}

        {/* A `<span>`, not a button: the whole card is already the link, and
            nesting a control inside an anchor is invalid. Purely an
            affordance — it appears on hover and on keyboard focus, so it is
            not something only mouse users learn about. */}
        <span
          aria-hidden="true"
          className="bg-background/25 pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 backdrop-blur-[2px] transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <span className="bg-accent text-accent-foreground rounded-full px-5 py-2.5 text-sm font-medium shadow-lg">
            {dict.home.viewDetails}
          </span>
        </span>
      </div>

      <span className="line-clamp-2 px-1 text-sm leading-relaxed font-medium">
        {product.name}
      </span>

      {/* The price is the line a shopper scans for, so it gets the size and
          the weight while the label beside it stays quiet. */}
      <span className="mt-auto px-1 pb-1 text-base font-semibold">
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
          <span className="text-muted text-sm font-normal">{dict.shop.unavailable}</span>
        )}
      </span>
    </Link>
  );
}
