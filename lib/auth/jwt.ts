/**
 * Reads the `exp` claim from an access token **without verifying the
 * signature**. This is only used to decide when to proactively refresh; every
 * real authorisation decision is made by the backend, which does verify.
 *
 * Nothing else is read from the token: the contract does not pin down the rest
 * of the claim names, so identity comes from `GET /auth/me` instead.
 */
export function getTokenExpiry(token: string): number | null {
  const payload = decodePayload(token);
  const exp = payload?.exp;
  return typeof exp === "number" ? exp : null;
}

/** True when the token is expired, or expires within `skewSeconds`. */
export function isTokenExpiring(token: string, skewSeconds = 60): boolean {
  const exp = getTokenExpiry(token);
  // A token we cannot read is treated as expiring, so it gets refreshed rather
  // than sent to the API and rejected.
  if (exp === null) return true;
  return exp - skewSeconds <= Math.floor(Date.now() / 1000);
}

function decodePayload(token: string): Record<string, unknown> | null {
  const segment = token.split(".")[1];
  if (!segment) return null;

  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
