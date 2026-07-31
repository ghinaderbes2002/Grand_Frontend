import Image from "next/image";

/**
 * An image hosted on the object store.
 *
 * `next/image` only optimizes hosts listed in `remotePatterns`, which is built
 * from `NEXT_PUBLIC_MEDIA_ORIGIN`. When that is unset the image still renders,
 * just unoptimized — so a missing env var costs performance, not correctness.
 *
 * Always rendered with `fill`, so every caller must give the wrapper a size and
 * `position: relative`. That is what keeps the layout from shifting as images
 * arrive.
 */
export function RemoteImage({
  src,
  alt,
  sizes,
  className = "",
  priority = false,
}: {
  src: string;
  /** Empty for decorative images — see the product grid. */
  alt: string;
  /** Tells the browser which candidate to pick before layout. */
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const optimized = Boolean(process.env.NEXT_PUBLIC_MEDIA_ORIGIN);

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!optimized}
      className={`object-cover ${className}`}
    />
  );
}
