import type { TokenPair } from "@/lib/api/types";

/**
 * Token refresh, isolated from the rest of the API client.
 *
 * Two things make this delicate, both straight out of the contract:
 *
 * 1. Refresh tokens **rotate** — every successful refresh invalidates the token
 *    that was used. So the new pair MUST be persisted, which is only possible
 *    where `Set-Cookie` can still be written: `proxy.ts`, Server Actions and
 *    Route Handlers. Never refresh during a Server Component render; the
 *    rotated token would be lost and the next refresh would look like reuse.
 *
 * 2. **Reusing a refresh token revokes every session the user has.** A single
 *    page load fires several requests (the document plus RSC prefetches) that
 *    all still carry the pre-refresh cookie, because none of them has seen the
 *    new `Set-Cookie` yet. Left alone, the second one to arrive looks exactly
 *    like a stolen-token replay and logs the user out everywhere.
 *
 * So a token is exchanged at most once, in two layers:
 *
 * - `inFlight` — requests that overlap an ongoing refresh share its promise.
 * - `recentlyExchanged` — requests that arrive just *after* it finished get the
 *   same result replayed from memory, without touching the backend.
 *
 * Both are per server instance, not a distributed lock. Replaying a result for
 * a short window does mean a token stays usable slightly past its rotation;
 * that is the accepted trade for not tripping reuse detection on every page
 * load, and it is bounded by GRACE_MS.
 */

/** How long a completed exchange stays replayable. */
const GRACE_MS = 60_000;
/** Hard cap so a busy server cannot grow the map without bound. */
const MAX_ENTRIES = 500;

export type RefreshResult =
  | { ok: true; tokens: TokenPair }
  /** The session is gone: expired, already rotated, or revoked. Log the user out. */
  | { ok: false; reason: "invalid" }
  /** The backend could not be reached. Keep the cookies and retry later. */
  | { ok: false; reason: "unreachable" };

const inFlight = new Map<string, Promise<RefreshResult>>();
const recentlyExchanged = new Map<string, { result: RefreshResult; expiresAt: number }>();

export async function refreshTokens(refreshToken: string): Promise<RefreshResult> {
  prune();

  const replayed = recentlyExchanged.get(refreshToken);
  if (replayed && replayed.expiresAt > Date.now()) {
    return replayed.result;
  }

  const existing = inFlight.get(refreshToken);
  if (existing) return existing;

  const pending = performRefresh(refreshToken)
    .then((result) => {
      // "unreachable" is deliberately not remembered — that one should be
      // retried on the next request rather than cached as a failure.
      if (result.ok || result.reason === "invalid") {
        recentlyExchanged.set(refreshToken, {
          result,
          expiresAt: Date.now() + GRACE_MS,
        });
      }
      return result;
    })
    .finally(() => {
      inFlight.delete(refreshToken);
    });

  inFlight.set(refreshToken, pending);
  return pending;
}

function prune() {
  const now = Date.now();
  for (const [token, entry] of recentlyExchanged) {
    if (entry.expiresAt <= now) recentlyExchanged.delete(token);
  }

  // Map iterates in insertion order, so this drops the oldest first.
  while (recentlyExchanged.size > MAX_ENTRIES) {
    const oldest = recentlyExchanged.keys().next();
    if (oldest.done) break;
    recentlyExchanged.delete(oldest.value);
  }
}

async function performRefresh(refreshToken: string): Promise<RefreshResult> {
  const baseUrl =
    process.env.API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, reason: "unreachable" };
  }

  if (response.status >= 500) {
    return { ok: false, reason: "unreachable" };
  }

  if (!response.ok) {
    return { ok: false, reason: "invalid" };
  }

  try {
    const data = (await response.json()) as Partial<TokenPair>;
    if (!data?.accessToken || !data?.refreshToken) {
      return { ok: false, reason: "invalid" };
    }
    return {
      ok: true,
      tokens: { accessToken: data.accessToken, refreshToken: data.refreshToken },
    };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
