/**
 * Grand Group's logo, as geometry.
 *
 * Rebuilt from the brand book rather than traced: the book only ships the logo
 * as a compressed raster, and a straight trace carried its JPEG ripple into
 * every edge. The five arcs are true circular crescents fitted to the artwork,
 * and the letters are redrawn on straight lines and clean curves against the
 * measured outline.
 *
 * Everything sits on one 940×520 canvas, so the pieces can be recombined — the
 * full lock-up, the arcs alone, the wordmark alone — without re-registering.
 * Kept free of React so the `ImageResponse` routes can import it too.
 */

export const LOGO_VIEWBOX = "0 0 940 520";
export const LOGO_RATIO = 940 / 520;

/** The arcs on their own, trimmed to their bounds. */
export const MARK_VIEWBOX = "0 0 526 520";

/** The two red crescents: the long one on the left and the one over the wordmark. */
export const ARC_RED = "M60.85 463.79A264.81 264.81 0 0 1 169.62 89.5L168.62 87.07A238.12 238.12 0 0 0 57.81 465.32ZM231.72 71.37A293.23 293.23 0 0 1 506.43 179.55L524.53 165.26A277.13 277.13 0 0 0 231.8 69.89Z";

/** The three navy crescents: the bottom sweep, the inner arc and the outer arc. */
export const ARC_NAVY = "M202.19 512.44A183.67 183.67 0 0 1 75.56 372.64L75.31 372.49A140.27 140.27 0 0 0 201.72 514.21ZM82.13 263.49A204.81 204.81 0 0 1 375.34 148.11L374.1 148.53A187.02 187.02 0 0 0 78.21 262.37ZM19.02 144.36A339.35 339.35 0 0 1 484.19 88.14L488.65 82.6A313.5 313.5 0 0 0 18.43 144.18Z";

/** The five crescents in drawing order, for anything that animates them one by one. */
export const ARCS: ReadonlyArray<{ d: string; tone: "red" | "navy" }> = [
  ...ARC_NAVY.split("Z").filter(Boolean).map((d) => ({ d: `${d}Z`, tone: "navy" as const })),
  ...ARC_RED.split("Z").filter(Boolean).map((d) => ({ d: `${d}Z`, tone: "red" as const })),
].sort((a, b) => arcOrder(a.d) - arcOrder(b.d));

/** Outermost first: orders the crescents by radius, largest to smallest. */
function arcOrder(d: string) {
  const radius = Number(/A([\d.]+)/.exec(d)?.[1] ?? 0);
  return -radius;
}

export const WORD_GRAND = "M200 197.6H268.1V231.2H205C185 231.2 173 240 173 262V300C173 318 180 327 198 327H236.4V295.5H203.6V263.5H268.1V358.2H200C162 358.2 141.9 318 141.9 290V262C141.9 243 163 197.6 200 197.6ZM300.2 199.9H378C405 199.9 422.4 217 422.4 243V252C422.4 272 411 287 394.6 295.5L427 358.2H396.1L364.3 295.5H331.5V358.2H300.2ZM331.5 231.2V263.5H380C390 263.5 396 257 396 247.4C396 237.8 390 231.2 380 231.2ZM505.8 199.4H539.9L602.7 358.2H569L554 326.6H491L477.6 358.2H444.4ZM522.3 239.5L500 295.9H545.5ZM620 199.5H651L714.8 304.7V199.5H746.3V358.5H714.6L650.6 258V358.5H620ZM778.1 199.5H845C882 199.5 904 225 904 260V290C904 330 880 358.8 845 358.8H778.1ZM808.8 232.6V325.5H842C860 325.5 872.2 312 872.2 290V268C872.2 248 862 232.6 842 232.6Z";

export const WORD_GROUP = "M158 396.2H195V408.4H160.5C156.5 408.4 154.2 410.7 154.2 414.7V433.2C154.2 437.2 156.5 439.5 160.5 439.5H183.1V429.9H163.2V418.2H195V451H158Q155 451 153 449.6L145.5 440Q144.1 438.2 144.1 435.5V412Q144.1 409.4 145.5 407.6L153 397.6Q155 396.2 158 396.2ZM209.4 396.1H238C246 396.1 250.3 402 250.3 410.5C250.3 418 246.5 423.5 240.5 425.5L255.4 451H242.4L229 428.2H220.9V451H209.4ZM220.9 406V418.4H235.5C238 418.4 239.5 416 239.5 412C239.5 408.5 238.5 406 236 406ZM289.6 395.1C305 395.1 315.2 404 315.2 418V428C315.2 443 305 451.6 289.6 451.6C274 451.6 264.1 443 264.1 428V418C264.1 404 274 395.1 289.6 395.1ZM289.2 405.1C280.5 405.1 275.1 410 275.1 418V428C275.1 436.5 280.5 441.5 289.2 441.5C298 441.5 303.2 436.5 303.2 428V418C303.2 410 298 405.1 289.2 405.1ZM328.5 395.5H340.5V432C340.5 437.5 342.5 440 347 440H352.6C357 440 359.1 437.5 359.1 432V395.5H371V434C371 445 364 450.9 350 450.9C335.5 450.9 328.5 445 328.5 434ZM384.8 396.1H414C423 396.1 428 402.5 428 412.5C428 423 422.5 430.4 413 430.4H396.8V450.6H384.8ZM396.8 406V420.5H412C414.8 420.5 416 417.5 416 413C416 408.5 414.8 406 412 406Z";

/** The registered mark: a ring and the R inside it. */
export const REG_RING = { cx: 919, cy: 185, r: 12.6, strokeWidth: 2.6 };
export const REG_R =
  "M914.2 178h5.8a4 4 0 0 1 1.2 7.8l3.2 6.2h-3.3l-2.9-5.8h-1.1v5.8h-2.9Zm2.9 2.5v3.3h2.7a1.65 1.65 0 0 0 0-3.3Z";

/** The brand's two inks, as the brand book specifies them. */
export const BRAND = {
  navy: "#242b66",
  red: "#e12027",
} as const;
