/**
 * Cookie names and options for the session. Kept free of `server-only` and of
 * `next/headers` so `proxy.ts` (which reads/writes cookies off the request and
 * response objects instead) can import it too.
 */

export const ACCESS_TOKEN_COOKIE = "ps_at";
export const REFRESH_TOKEN_COOKIE = "ps_rt";

/** Contract: access tokens last 15 minutes. */
export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
/** Contract: refresh tokens last 7 days. */
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export type CookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
};

/**
 * `Secure` on, unless the deployment says otherwise.
 *
 * A browser silently *discards* a `Secure` cookie that arrives over plain
 * HTTP. On a production build served without TLS that means the session
 * cookies are never stored, so every navigation into `/account`, `/cart` or
 * `/admin` bounces back to the login page — the login itself having appeared
 * to succeed. `COOKIE_SECURE=false` is the escape hatch for a host that is not
 * behind HTTPS yet; the tokens then travel in clear text, so it is a stopgap
 * and not a setting to leave on.
 *
 * Read as a literal `process.env.X` because `proxy.ts` imports this file and
 * the proxy bundle has its environment inlined at build time — the value has
 * to be present when the image is built, not only when it runs.
 */
const secure =
  process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE !== "false"
    : process.env.NODE_ENV === "production";

function baseOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge,
  };
}

/**
 * The access cookie is deliberately given the token's own lifetime: once it
 * expires the cookie disappears, which is the signal the proxy uses to refresh.
 */
export function accessCookieOptions(expiresAtSeconds?: number | null): CookieOptions {
  const maxAge = expiresAtSeconds
    ? Math.max(1, expiresAtSeconds - Math.floor(Date.now() / 1000))
    : ACCESS_TOKEN_MAX_AGE;
  return baseOptions(maxAge);
}

export function refreshCookieOptions(): CookieOptions {
  return baseOptions(REFRESH_TOKEN_MAX_AGE);
}

/** Options for deleting a cookie via a `Set-Cookie` header. */
export function clearedCookieOptions(): CookieOptions {
  return baseOptions(0);
}
