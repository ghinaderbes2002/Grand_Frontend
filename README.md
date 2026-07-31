# Printing Store — frontend

Next.js 16 (App Router) frontend for the printing-store API described in
`API_CONTRACT.md`.

## Running it

```bash
cp .env.example .env.local   # point API_BASE_URL at the backend
npm run dev                  # http://localhost:3001
```

The frontend runs on **3001** because the backend already owns 3000.

| Script                    | What it does                              |
| ------------------------- | ----------------------------------------- |
| `npm run dev`             | Dev server on port 3001                   |
| `npm run build`           | Production build + type check             |
| `npm test`                | End-to-end suites against a mock backend  |
| `npm run typecheck`       | `tsc --noEmit`                            |
| `npm run lint`            | ESLint                                    |
| `npm run verify:contract` | Check a live backend against our assumptions |

## Testing

Two things are being checked, and they are not the same thing.

`npm test` (needs `npm run build` first) boots `tests/mock-api.mjs` and the
production build against it, then runs 181 checks across eight suites: token
refresh under concurrency, catalog CRUD, product/variant/price flows, inventory,
the admin filtering and bulk-pricing screens, and the customer journey from
browsing through cart, checkout and order pages. It verifies **this frontend's
behaviour** — routing, permission gating, form shapes, RTL/LTR, 404s.

Server Actions are not replayed over HTTP: their ids are build hashes and bound
arguments are encoded into the form, so driving them would test Next's plumbing
more than this code. The suites drive mutations through the mock's REST API and
assert on what the pages then render.

The mock enforces the permission the contract states for every endpoint, so the
suites exercise what the API would actually allow — not merely what the UI
chooses to show. `customer-role.test.mjs` runs the whole purchase journey as a
real `customer` (permissions `[]`), which is the only suite that can catch a
screen the UI opens but the API would refuse.

It does **not** verify the backend. The mock encodes our reading of
`API_CONTRACT.md`, so a misreading would be mirrored in both and the tests would
still pass. That is what `npm run verify:contract` is for.

> **Open contract question — order cancellation.** Line 398 documents
> `PATCH /orders/:id/status` as requiring `orders.updateStatus`, while note 11
> tells the frontend to use that same call to cancel — and a customer holds no
> permissions. Compare `POST /orders/:id/pay`, which grants the order owner
> access explicitly; nothing similar is written here. Read literally, a customer
> cancelling gets a 403, and `customer-role.test.mjs` asserts that reading. The
> button is deliberately kept and a 403 is mapped to its own message, so if the
> backend does allow owners nothing needs changing beyond that expectation.

> When asserting on markup, match rendered tags — never bare substrings. The RSC
> payload embeds the entire dictionary, so `html.includes("Delete")` is true on
> every page whether or not a delete button rendered.

## Verifying against the real backend

This frontend was written from `API_CONTRACT.md`, not from a running server.
Where the contract is silent the code had to assume something, and those
assumptions are what `scripts/verify-contract.mjs` checks:

```bash
npm run verify:contract                    # read-only probes
VERIFY_WRITES=1 npm run verify:contract    # also create and delete sample data
```

It logs in with the seed account, probes each endpoint the frontend depends on,
and prints `MATCH` / `MISMATCH` / `UNKNOWN` per assumption, exiting non-zero if
anything mismatched. The write probes create records prefixed `zz-verify-` and
delete them again on the way out — **point it at a development database**.

The open questions it answers, all of which the contract leaves unstated:

| Assumption in the code | Why it matters |
| --- | --- |
| A new product starts as `DRAFT` | The admin list caveat and the post-create redirect depend on it |
| `POST /products` returns the record with an `id` | The create flow redirects to `created.id` |
| `super_admin` gets a populated `permissions` array | If empty, the special case in `lib/auth/permissions.ts` is load-bearing |
| `InventoryLevel` carries `variantId` / `warehouseId` | The contract names only the two quantity fields |
| `InventoryMovement` field names | The contract names the movement *types*, not the shape |
| The variants list embeds `prices` | The UI degrades cleanly either way, but it changes what a page shows |

Run it before trusting the `TODO`-marked types in `lib/api/types.ts` — those
cover entities (`Order`, `Payment`, `Shipment`, `OrderItem`) the contract never
spells out field-by-field.

## How it is put together

### The browser never talks to the API directly

`API_BASE_URL` is server-side only. Every call goes through this app — Server
Components, Server Actions, `proxy.ts` — so the access and refresh tokens live
in **httpOnly cookies** (`ps_at`, `ps_rt`) that client JavaScript cannot read.
The contract hands tokens back in the response body and leaves storage to the
frontend; this is that decision.

### Token refresh happens in exactly one place

Refresh tokens **rotate**, and replaying a spent one revokes every session the
user has. Two consequences shape the design:

- Cookies cannot be written during a Server Component render, so a refresh
  there would lose the rotated token. Refresh therefore lives in `proxy.ts`
  (plus Server Actions, which may also write cookies).
- One page load fires several requests that all still carry the pre-refresh
  cookie. `lib/auth/refresh.ts` collapses them: overlapping requests share one
  in-flight refresh, and stragglers arriving just after it replay the result
  from a 60-second grace window instead of hitting the backend again.

Both caches are per server instance, not a distributed lock — see the comments
in that file before scaling out.

### Caching, and the one rule that matters

Public catalog reads are cached and tagged (`lib/api/cache.ts`); everything else
is not. The shop page alone used to make ~28 uncached calls per view — the
listing, categories, brands, the tree, and one media call per product.

**A cached response is shared between users, so nothing carrying a token may be
cached.** That is enforced in `apiFetch`, not by convention: when a token is
attached, `cache: "no-store"` is forced regardless of what the caller passed.
A caller cannot make that mistake by accident, and `caching.test.mjs` guards it.

Admin mutations call `updateTag` (not `revalidateTag`) so an editor sees their
own change immediately rather than stale-while-revalidate. The `revalidate`
lifetimes are only a backstop for writes this app does not make — a CSV import
run elsewhere, another admin client, a direct database edit.

`CACHE_TTL_SCALE=0` disables caching; the test runner sets it, because the
suites seed straight through the API and never trigger the invalidating actions.

### Images and headers

Product images render through `next/image` (`components/ui/remote-image.tsx`),
which needs to be told which remote host to trust. Set
`NEXT_PUBLIC_MEDIA_ORIGIN` to the object store's origin and images get resized,
converted to WebP/AVIF and lazy-loaded. Leave it unset and they still render —
`unoptimized` bypasses the optimizer — so a missing env var costs performance,
not correctness. Every image is rendered with `fill` inside a sized wrapper, so
the grid does not shift as they arrive.

`next.config.ts` also sets `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options` and a `Permissions-Policy` that switches off camera,
microphone and geolocation. There is no CSP yet — writing one that does not
break Next's inline bootstrap scripts needs nonce plumbing through `proxy.ts`.

### Layout

| Path                    | What lives there                                              |
| ----------------------- | ------------------------------------------------------------- |
| `proxy.ts`              | Locale routing, token refresh, optimistic route guards         |
| `lib/api/types.ts`      | TypeScript mirror of `API_CONTRACT.md`                         |
| `lib/api/client.ts`     | `apiFetch` — server-only, throws `ApiError` / `NetworkError`   |
| `lib/api/catalog.ts`    | Catalog reads (categories, attributes, brands)                 |
| `lib/api/products.ts`   | Product, variant and price reads                               |
| `lib/api/inventory.ts`  | Stock levels, movement log, warehouses                         |
| `lib/api/orders.ts`     | Cart, orders, shipments                                        |
| `lib/api/media.ts`      | Media listing (upload lives in `lib/admin/media.ts`)           |
| `lib/api/imports.ts`    | CSV import batches                                             |
| `lib/shop/cart.ts`      | Customer cart, checkout and order cancellation                 |
| `lib/orders/`           | Order status transition map                                    |
| `tests/`                | Mock backend and end-to-end suites                             |
| `lib/auth/`             | Cookies, JWT expiry, refresh, session, permissions, actions    |
| `lib/admin/`            | Catalog mutations as Server Actions, plus their zod schemas    |
| `lib/forms/`            | Form state, field helpers, API-error → dictionary-key mapping  |
| `lib/i18n/`             | Locales, dictionaries, client context                          |
| `app/[lang]/`           | All routes, nested under the locale segment                    |

### Internationalization

Arabic (default, RTL) and English (LTR). Every route is under `app/[lang]/`;
`proxy.ts` redirects unprefixed URLs using the `NEXT_LOCALE` cookie, then
`Accept-Language`. Dictionaries are `lib/i18n/dictionaries/{ar,en}.json`, and
`ar.json` defines the type both must satisfy — a key added to one and forgotten
in the other fails the build.

Server components read the dictionary directly via `getDictionary(lang)`;
client components use `useI18n()`. Note that the provider hands the whole
dictionary to the client, so every string ends up in the RSC payload — fine for
a few KB of public copy, worth revisiting if the dictionaries grow large.

### Auth surface

`login`, `register`, `forgot-password`, `reset-password`, and a protected
`account` page. Guards are layered: `proxy.ts` does a cheap cookie-presence
check, and `requireSession()` does the real one against `GET /auth/me`.

Seeded dev account (development only, per the contract):
`admin@printing-store.local` / `ChangeMe123!`

### Admin panel

`/[lang]/admin` covers the catalog structure: categories (as a tree, with
parent moves), attributes and their options, brands, and the category ↔
attribute links that decide which attributes create product variants.

Access is checked in three places, each doing a different job:

- `proxy.ts` — cookie presence only, to avoid rendering a page nobody can see.
- The page — `requireSession()` then `can(session, …)`, rendering `<NoAccess>`.
- The Server Action — `requireSession()` again, because actions are reachable
  by direct POST regardless of which page linked to them.

`lib/auth/permissions.ts` treats `super_admin` as holding every permission. The
contract does not say what that role's `permissions` array contains, so this
keeps the UI correct either way; the backend remains the real check.

### Products

Creating a product is a two-step flow (`/admin/products/new`) because the form
depends on the category: the category's attribute links decide both the product
type and which fields exist. Step one is a plain GET form, so it works without
client JavaScript.

Two rules from the contract are enforced by construction rather than left to the
user to trip over:

- **Type is derived, not chosen.** A category with variant-creating attributes
  produces a `VARIABLE` product; one without produces a `SIMPLE` one. Sending
  the wrong type is a 400, so it is never offered.
- **Attributes are split by role.** Informational attributes render on the
  product form; variant-creating ones render on the variant form, where all of
  them are required because a variant must cover exactly that set.

Attribute inputs are named `attr__<attributeId>` and shaped by attribute type —
`SELECT`/`COLOR_SELECT` submit the option's `value` (case-sensitive, never the
label), the `*_UNIT` types render number inputs with the unit in the label.

> **Contract gap:** there is no admin product listing endpoint. `GET /products`
> is public and returns `PUBLISHED` only, so drafts and archived products cannot
> be enumerated — `GET /products/:id` reads any status, but only if you already
> know the id. The list screen says so, and creating a product redirects
> straight to its detail page. Worth raising with the backend team.

### Inventory

Stock lives on the variant, so it is reached through the product:
`/admin/products/[id]/variants/[variantId]` shows levels per warehouse, the
movement log, and the two mutation forms. The product page shows a compact
on-hand/available summary per variant and links through.

Receiving and adjusting are separate on purpose, matching the API: a receipt
only adds and its reason is optional, while an adjustment accepts negatives and
*requires* a reason, because it is a manual correction that has to be
justifiable in the audit trail. The API refuses an adjustment that would take
stock below what open orders have reserved (409).

`warehouseId` is never sent. The contract says cart and orders always fall back
to the first active warehouse and there is no picker in the UI, so leaving it
off keeps admin actions consistent with how orders actually behave. Levels shown
on the product page are summed across warehouses for the same reason.

> The inventory endpoint is per-variant with no bulk form, so a product page
> issues one call per variant (in parallel, and skipped entirely for roles
> without `inventory.read`). Fine for a handful of variants; worth a bulk
> endpoint if products grow dozens of them.

### Media

Uploads follow the contract's three-step flow: `presign` (Server Action) → `PUT`
straight from the browser to MinIO/S3 → `confirm` (Server Action). The file never
touches this server. The middle step cannot be a Server Action, which is why
`components/admin/media-manager.tsx` is a client component.

Type and size are validated in the browser *and* re-validated in the Server
Action — actions are reachable by direct POST, so the browser check is a
convenience, not a guarantee. Images render through plain `<img>`: the storage
host is not known at build time, so `next/image`'s `remotePatterns` cannot cover
it.

### Orders, payments and shipments

`lib/orders/transitions.ts` encodes the documented status flow so the UI only
offers legal next statuses. It is a **convenience, not the rule** — the API owns
the state machine and rejects anything else with a 409 whose message is shown
verbatim. If the backend allows an edge that map is missing, add it; nothing
breaks, the option just is not offered.

Creating a shipment moves the order to `SHIPPED` on its own, and marking one
delivered moves it to `DELIVERED` — so those transitions are driven from the
shipment forms rather than the status dropdown.

Order creation and payment both send an `Idempotency-Key`, so a double-click or a
retry after a dropped connection cannot create a duplicate.

> **Contract gap:** there is no endpoint to list an order's payments.
> `POST /orders/:id/pay` returns a payment record and
> `POST /payments/:paymentId/refund` needs an id, but nothing connects them. The
> refund form therefore only appears when the order response happens to embed
> `payments`. Worth raising alongside the missing admin product listing.

### Storefront

`/[lang]/shop` filters entirely through the URL via a plain GET form, so results
are shareable and the page works without client-side JavaScript. Pagination is
cursor-based, and the "load more" link carries the active filters alongside the
cursor.

Attribute filters appear once a category is chosen, because attributes are
linked per category — the form loads that category's `isFilterable` attributes
from `GET /category-attributes` and renders one control per attribute, shaped by
its type. Each becomes an `attr_<key>` param, which is what the products
endpoint expects; `SELECT`/`COLOR_SELECT` submit the option's `value`, never its
label.

Product pages carry their own title, description, Open Graph image and canonical
URL; `app/robots.ts` keeps crawlers off everything behind a login and
`app/sitemap.ts` walks the cursor-paginated listing to enumerate published
products in both locales. Set `SITE_URL` in production — it is the base for
every canonical and OG URL.

> **Two known costs, both removable by the backend.** The listing issues one
> `GET /media` per product because the products response carries no image;
> embedding a thumbnail would delete that entirely. And the cart can only name a
> line if the cart response embeds `variant.product` — a customer cannot resolve
> it themselves, since `GET /products/:id` needs `products.read`. The UI falls
> back to the SKU when it is absent.

Checkout sends no line items — the API builds the order from the server-side
cart. A cart whose `total` is `null` (some line has no retail price) blocks
checkout in the UI, because the API rejects it anyway.

### No `loading.tsx` — on purpose

Adding `loading.tsx` was tried and reverted. It wraps a segment in Suspense, so
the shell flushes before the page's data resolves — and once the response has
started streaming its **status is already committed as 200**. Every detail route
that calls `notFound()` then returned 200 with the not-found UI inside it, which
is wrong for SEO, monitoring and caching.

Skeletons are still worth having; they just cannot come from a `loading.tsx`
that also covers a 404-able child. Two ways forward, whenever this is picked up:

- Put the listing pages in a route group (`shop/(browse)/page.tsx`) so their
  `loading.tsx` does not cover `[slug]`.
- Or keep the 404-determining fetch above a `<Suspense>` inside the page and
  stream only what follows it.

`components/ui/skeleton.tsx` is left in place for either route.

## Not built yet

Everything in the contract is now covered. What remains is verification: run
`npm run verify:contract` against the real backend, and treat the `TODO`-marked
types in `lib/api/types.ts` as unconfirmed until you have seen a real response —
particularly `OrderItem`, which the contract never spells out field-by-field.

The verify script covers auth, catalog, products, variants, prices and
inventory. It does **not** yet cover orders, payments, shipments, media or
imports, since those need a much longer setup chain (stock, prices, a cart) to
reach.
