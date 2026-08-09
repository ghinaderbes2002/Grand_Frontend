import { ImageResponse } from "next/og";

/**
 * iOS ignores SVG favicons and crops whatever it gets into a rounded square,
 * so the mark is drawn on an opaque field with its own padding rather than
 * letting the home screen guess.
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
          background: "#111315",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path
            d="M16 2c0 0 9 10.5 9 16a9 9 0 1 1-18 0c0-5.5 9-16 9-16z"
            fill="#ffffff"
          />
        </svg>
      </div>
    ),
    size,
  );
}
