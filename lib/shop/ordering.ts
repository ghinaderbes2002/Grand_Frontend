/**
 * Whether the storefront takes orders.
 *
 * Suspended for now: the catalog is the whole shop. The API's cart is
 * server-side and keyed to an account, so every buy control led to a login
 * page — and a customer should never be asked to sign in just to look at
 * products. With this off:
 *
 * - the product page shows no buy controls and no "log in to buy" notice,
 * - `/cart`, `/checkout` and `/orders` answer 404,
 * - the proxy stops guarding those routes, so nothing redirects to login,
 * - the footer drops the links to them.
 *
 * Nothing was deleted. Setting this to `true` brings the whole flow back
 * exactly as it was.
 *
 * Deliberately a constant rather than an env var: it changes which routes
 * exist, which is a property of the build, and it keeps `proxy.ts` free of
 * environment inlining surprises.
 */
export const ORDERING_ENABLED = false;
