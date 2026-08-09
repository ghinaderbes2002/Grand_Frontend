import Link from "next/link";

import { RemoteImage } from "@/components/ui/remote-image";
import type { Category } from "@/lib/api/types";

/**
 * A category as a wide split panel: image on one side, name and a way in on
 * the other.
 *
 * The halves swap sides on alternate rows so the images zigzag down the page
 * rather than stacking in one column. `flex-row-reverse` does it in logical
 * terms, so the zigzag mirrors correctly in Arabic without a second rule.
 */
export function CategoryRow({
  category,
  href,
  label,
  meta,
  imageUrl,
  /** Even rows lead with the copy, odd rows lead with the image. */
  flipped = false,
}: {
  category: Category;
  href: string;
  label: string;
  meta?: string;
  imageUrl?: string | null;
  flipped?: boolean;
}) {
  const src = imageUrl ?? category.imageUrl;

  return (
    <Link
      href={href}
      className={`border-border bg-surface/40 hover:shadow-raised group flex flex-col overflow-hidden rounded-3xl border transition duration-300 hover:-translate-y-1 md:flex-row ${
        flipped ? "md:flex-row-reverse" : ""
      }`}
    >
      {/* Fixed aspect on mobile so the row keeps its shape before the image
          loads; on wide screens the two halves match each other's height. */}
      <div className="bg-surface relative aspect-[16/10] w-full overflow-hidden md:aspect-auto md:w-1/2 md:self-stretch">
        {src ? (
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
            {/* Decorative: the name is rendered as text in the other half. */}
            <RemoteImage
              src={src}
              alt=""
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
        ) : (
          <div className="halftone absolute inset-0" aria-hidden="true" />
        )}
      </div>

      <div className="flex w-full flex-col justify-center gap-5 p-8 md:w-1/2 md:p-12">
        <span className="bg-accent/10 text-accent-strong flex size-12 items-center justify-center rounded-2xl">
          <TagIcon className="size-5" />
        </span>

        <span className="flex flex-col gap-1.5">
          <span className="text-title">{category.name}</span>
          {meta ? <span className="text-muted text-sm">{meta}</span> : null}
        </span>

        {/* A span, not a nested link: the whole panel is already the anchor. */}
        <span className="text-accent-strong flex items-center gap-2 text-sm font-medium">
          {label}
          {/* Mirrored in RTL, where "forward" points the other way. */}
          <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h9l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
