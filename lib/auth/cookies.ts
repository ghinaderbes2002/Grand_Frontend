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

function baseOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
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
