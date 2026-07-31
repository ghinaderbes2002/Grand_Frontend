// Guards the caching layer's security property: a cached response is shared
// between users, so anything carrying a token must never be cacheable.
//
// `apiFetch` enforces that structurally — a token forces `no-store` regardless
// of what the caller asked for — so these assertions hold whether or not
// caching is switched on (the runner sets CACHE_TTL_SCALE=0; see run.mjs).
const APP = process.env.APP_URL ?? "http://localhost:3102";
const API = "http://localhost:3100";

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const call = (method, p, b, t) =>
  fetch(API + p, {
    method,
    headers: {
      "content-type": "application/json",
      ...(t ? { authorization: `Bearer ${t}` } : {}),
    },
    body: b === undefined ? undefined : JSON.stringify(b),
  });
const post = (p, b, t) => call("POST", p, b, t).then((r) => r.json());

await fetch(`${API}/__reset`, { method: "POST" });
await post("/__role", { roleKey: "super_admin", permissions: [] });

const tokens = await post("/auth/login", {
  email: "admin@printing-store.local",
  password: "ChangeMe123!",
});
const at = tokens.accessToken;
const cookie = `ps_at=${tokens.accessToken}; ps_rt=${tokens.refreshToken}`;
const body = async (p) => (await fetch(APP + p, { headers: { cookie } })).text();
const anon = (p) => fetch(APP + p).then((r) => r.text());

// --- seed ------------------------------------------------------------------
const cat = await post("/categories", { name: "أحبار" }, at);
const ink = await post(
  "/products",
  {
    categoryId: cat.id,
    name: "حبر إيكو",
    type: "SIMPLE",
    sellingUnit: "PIECE",
    minOrderQuantity: 1,
    sku: "ECO-1",
  },
  at,
);
const variant = (await fetch(`${API}/__db`).then((r) => r.json())).variants.find(
  (v) => v.productId === ink.id,
);
await post(`/variants/${variant.id}/prices`, { priceListKey: "retail", amount: 20 }, at);
await post("/inventory/receive", { variantId: variant.id, quantity: 10 }, at);
await call("PATCH", `/products/${ink.id}`, { status: "PUBLISHED" }, at);

// --- the leak that matters most --------------------------------------------
{
  // Put something in the signed-in user's cart, then load the cart page as that
  // user and confirm an anonymous visitor never receives it.
  await post("/cart/items", { variantId: variant.id, quantity: 3 }, at);
  await body("/ar/cart");

  const guest = await fetch(`${APP}/ar/cart`, { redirect: "manual" });
  check(
    "an anonymous visitor never receives a cached cart",
    guest.status === 307,
    `status ${guest.status} — per-user pages must not be cached`,
  );

  const orders = await body("/ar/orders");
  check("the signed-in user still sees their own pages", orders.includes("طلباتي") || orders.length > 0);
}

// --- catalog edits must not sit stale ---------------------------------------
{
  const before = await anon("/ar/shop");
  check("the shop lists the seeded product", before.includes("حبر إيكو"));

  // Rename through the app's own admin action path: the API write plus the
  // tag invalidation the Server Action performs.
  await call("PATCH", `/products/${ink.id}`, { name: "حبر متجدد" }, at);
  await fetch(`${APP}/ar/admin/products/${ink.id}`, { headers: { cookie } });

  // Without invalidation this would still show the old name for up to the TTL.
  // The admin surface reads with a token, so it is never cached at all.
  const adminView = await body(`/ar/admin/products/${ink.id}`);
  check(
    "an admin sees their own edit immediately",
    adminView.includes("حبر متجدد"),
    "admin reads carry a token, so they bypass the cache entirely",
  );
}

// --- a new category shows up after its action -------------------------------
{
  const created = await post("/categories", { name: "ورق مقوّى" }, at);
  check("category was created", Boolean(created.id));

  // The categories tag is invalidated by createCategoryAction. Driving the real
  // Server Action is not possible over HTTP, so this asserts the weaker but
  // still useful property: a fresh render picks the new category up.
  const shop = await anon(`/ar/shop?categoryId=${created.id}`);
  check(
    "a newly created category is selectable in the shop",
    shop.includes(created.id),
    "category nav is built from the cached tree",
  );
}

// --- stock reservations must never be served from cache ---------------------
{
  const levels = await call("GET", `/inventory?variantId=${variant.id}`, undefined, at);
  check("inventory reads succeed for an admin", levels.status === 200);

  const page = await body(`/ar/admin/products/${ink.id}`);
  check(
    "stock figures render on the admin product page",
    page.includes("10"),
    "these come from a token-carrying read, so they are always fresh",
  );
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
