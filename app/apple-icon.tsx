import { ImageResponse } from "next/og";

import { ARC_NAVY, ARC_RED, BRAND, MARK_VIEWBOX } from "@/components/brand/logo-paths";

/**
 * iOS ignores SVG favicons and crops whatever it gets into a rounded square,
 * so the arcs are drawn on an opaque navy field with their own padding rather
 * than letting the home screen guess.
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
          background: BRAND.navy,
        }}
      >
        <svg width="132" height="116" viewBox={MARK_VIEWBOX} style={{ marginLeft: 14 }}>
          <path fill="#ffffff" fillRule="evenodd" d={ARC_NAVY} />
          <path fill={BRAND.red} fillRule="evenodd" d={ARC_RED} />
        </svg>
      </div>
    ),
    size,
  );
}
