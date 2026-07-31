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
      className="border-border hover:bg-surface flex h-full flex-col gap-3 rounded-xl border p-3 transition"
    >
      {/* Decorative: the product name sits right below it, so an alt would
          only repeat what a screen reader already reads out. */}
      <div className="border-border bg-surface relative aspect-square w-full overflow-hidden rounded-lg border">
        {image ? (
          <RemoteImage
            src={image.url}
            alt=""
            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
          />
        ) : null}
      </div>

      <span className="font-medium">{product.name}</span>

      <span className="text-muted mt-auto text-sm">
        {price ? (
          price.min === price.max ? (
            formatAmount(price.min, locale)
          ) : (
            <>
              {dict.shop.from} {formatAmount(price.min, locale)}
            </>
          )
        ) : (
          dict.shop.unavailable
        )}
      </span>
    </Link>
  );
}
