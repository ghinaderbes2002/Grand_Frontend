import { ImageResponse } from "next/og";

/**
 * iOS ignores SVG favicons and crops whatever it gets into a rounded square,
 * so the mark is drawn on an opaque field with its own padding rather than
 * letting the home screen guess.
 *
 * The geometry is a hand-kept copy of `components/brand/logo.tsx`; a metadata
 * route cannot import a component.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2c5470",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
<g fill="#ffffff">
            <rect x="6" y="6" width="13" height="20" rx="2" opacity="0.38" transform="rotate(-14 12.5 16)" />
            <path d="M12 7h6l5 5v13a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
            <path d="M18 7l5 5h-4a1 1 0 0 1-1-1Z" opacity="0.45" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
