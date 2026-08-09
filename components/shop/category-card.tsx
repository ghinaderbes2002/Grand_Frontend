import Link from "next/link";

import { RemoteImage } from "@/components/ui/remote-image";
import type { Category } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/config";

/**
 * A category as an image box: photo, dark scrim, name over it.
 *
 * The scrim is not decoration — the name is white text laid on an arbitrary
 * photograph, and a gradient is the only way to guarantee it stays readable
 * whatever the image turns out to be.
 */
export function CategoryCard({
  category,
  locale,
  imageUrl,
  /** Defaults to the filtered shop; the categories page points it at itself. */
  href,
  /** A small line under the name, e.g. how many subcategories it holds. */
  meta,
}: {
  category: Category;
  locale: Locale;
  /** Falls back to `category.imageUrl`, then to a plain panel. */
  imageUrl?: string | null;
  href?: string;
  meta?: string;
}) {
  const src = imageUrl ?? category.imageUrl;

  return (
    <Link
      href={href ?? `/${locale}/shop?categoryId=${category.id}`}
      className="border-border bg-surface hover:shadow-raised group relative flex aspect-[4/5] overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1"
    >
      {src ? (
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
          {/* Decorative: the name is rendered as text right below it. */}
          <RemoteImage
            src={src}
            alt=""
            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
          />
        </div>
      ) : null}

      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
      />

      <span className="relative mt-auto flex w-full flex-col gap-1 p-5 text-white">
        <span className="text-base font-semibold">{category.name}</span>
        {meta ? <span className="text-xs text-white/70">{meta}</span> : null}
      </span>
    </Link>
  );
}
