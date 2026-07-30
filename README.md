# Printing Store — frontend

Next.js 16 (App Router) frontend for the printing-store API described in
`API_CONTRACT.md`.

## Running it

```bash
cp .env.example .env.local   # point API_BASE_URL at the backend
npm run dev                  # http://localhost:3001
```

The frontend runs on **3001** because the backend already owns 3000.

| Script              | What it does                     |
| ------------------- | -------------------------------- |
| `npm run dev`       | Dev server on port 3001          |
| `npm run build`     | Production build + type check    |
| `npm run typecheck` | `tsc --noEmit`                   |
| `npm run lint`      | ESLint                           |

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

### Layout

| Path                    | What lives there                                              |
| ----------------------- | ------------------------------------------------------------- |
| `proxy.ts`              | Locale routing, token refresh, optimistic route guards         |
| `lib/api/types.ts`      | TypeScript mirror of `API_CONTRACT.md`                         |
| `lib/api/client.ts`     | `apiFetch` — server-only, throws `ApiError` / `NetworkError`   |
| `lib/api/catalog.ts`    | Catalog reads (categories, attributes, brands)                 |
| `lib/api/products.ts`   | Product, variant and price reads                               |
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

## Not built yet

Inventory, cart, orders, payments, shipments, media upload and CSV import. Types
for all of those are already in `lib/api/types.ts`; entities the contract does
not spell out field-by-field are marked with `TODO` — confirm them against a
real response before relying on them.
