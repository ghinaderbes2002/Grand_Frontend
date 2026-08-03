// Covers coupon management and the checkout discount preview.
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

// --- seed a sellable product ----------------------------------------------
const cat = await post("/categories", { name: "أحبار" }, at);
const product = await post(
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
  (v) => v.productId === product.id,
);
await post(`/variants/${variant.id}/prices`, { priceListKey: "retail", amount: 50 }, at);
await post("/inventory/receive", { variantId: variant.id, quantity: 100 }, at);
await call("PATCH", `/products/${product.id}`, { status: "PUBLISHED" }, at);

// --- admin management ------------------------------------------------------
const percentage = await post(
  "/coupons",
  { code: "SAVE10", type: "PERCENTAGE", value: 10, isActive: true },
  at,
);
await post(
  "/coupons",
  { code: "FLAT5", type: "FIXED_AMOUNT", value: 5, maxUses: 1, isActive: true },
  at,
);
await post(
  "/coupons",
  { code: "BIGORDER", type: "PERCENTAGE", value: 50, minOrderTotal: 500, isActive: true },
  at,
);

{
  const list = await body("/ar/admin/coupons");
  check("coupons are listed", list.includes("SAVE10") && list.includes("FLAT5"));
  check("a percentage coupon shows its percentage", list.includes("10%"));
  check("a fixed coupon shows a formatted amount", list.includes("5.00"));
  check("use limits are shown", list.includes("/ 1"), "FLAT5 allows one use");

  const detail = await body(`/ar/admin/coupons/${percentage.id}`);
  check("the edit form is prefilled", detail.includes('value="SAVE10"'));

  const duplicate = await post(
    "/coupons",
    { code: "SAVE10", type: "PERCENTAGE", value: 20, isActive: true },
    at,
  );
  check(
    "a duplicate code is rejected",
    duplicate.statusCode === 409,
    JSON.stringify(duplicate),
  );
}

// --- validation, which must not consume ------------------------------------
{
  const before = await call("GET", `/coupons/${percentage.id}`, undefined, at).then((r) =>
    r.json(),
  );

  const valid = await post("/coupons/validate", { code: "SAVE10", subtotal: 100 }, at);
  check("a valid coupon reports its discount", valid.discountAmount === 10, JSON.stringify(valid));

  const after = await call("GET", `/coupons/${percentage.id}`, undefined, at).then((r) =>
    r.json(),
  );
  check(
    "validating does not consume a use",
    after.usedCount === before.usedCount,
    `${before.usedCount} -> ${after.usedCount}`,
  );

  const belowMinimum = await post(
    "/coupons/validate",
    { code: "BIGORDER", subtotal: 100 },
    at,
  );
  check(
    "a coupon below its minimum order is refused",
    belowMinimum.valid === false,
    JSON.stringify(belowMinimum),
  );

  const unknown = await call(
    "POST",
    "/coupons/validate",
    { code: "NOPE", subtotal: 100 },
    at,
  );
  check("an unknown code 404s", unknown.status === 404, `status ${unknown.status}`);
}

// --- checkout ---------------------------------------------------------------
{
  await post("/cart/items", { variantId: variant.id, quantity: 2 }, at);
  const page = await body("/ar/checkout");
  check("checkout offers a coupon field", page.includes('name="couponCode"'));
  check("the cart subtotal is shown", page.includes("100.00"), "2 × 50");
}

// --- the order is where it is actually consumed -----------------------------
{
  const order = await post(
    "/orders",
    { shippingAddress: { city: "عمّان", street: "ش" }, couponCode: "SAVE10" },
    at,
  );
  check(
    "the discount is applied to the order total",
    order.total === 90 && order.discountAmount === 10,
    JSON.stringify({ total: order.total, discountAmount: order.discountAmount }),
  );

  const used = await call("GET", `/coupons/${percentage.id}`, undefined, at).then((r) =>
    r.json(),
  );
  check("placing the order consumes a use", used.usedCount === 1, `used ${used.usedCount}`);
}

// --- a coupon at its limit --------------------------------------------------
{
  await post("/cart/items", { variantId: variant.id, quantity: 1 }, at);
  const first = await post(
    "/orders",
    { shippingAddress: { city: "عمّان", street: "ش" }, couponCode: "FLAT5" },
    at,
  );
  check("the single-use coupon works once", first.total === 45, `total ${first.total}`);

  await post("/cart/items", { variantId: variant.id, quantity: 1 }, at);
  const second = await call(
    "POST",
    "/orders",
    { shippingAddress: { city: "عمّان", street: "ش" }, couponCode: "FLAT5" },
    at,
  );
  check(
    "an exhausted coupon is refused on the second order",
    second.status === 409,
    `status ${second.status}`,
  );
  await call("DELETE", "/cart", undefined, at);
}

// --- permissions ------------------------------------------------------------
await post("/__role", { roleKey: "customer", permissions: [] });
{
  const admin = await body("/ar/admin/coupons");
  check("managing coupons needs promotions.manage", admin.includes("ما عندك صلاحية"));

  const list = await call("GET", "/coupons", undefined, at);
  check("the API refuses the listing too", list.status === 403, `status ${list.status}`);

  // Validation is deliberately available to any signed-in customer — that is
  // what lets the storefront preview a discount.
  const preview = await call(
    "POST",
    "/coupons/validate",
    { code: "SAVE10", subtotal: 100 },
    at,
  );
  check(
    "but a customer can still validate a code",
    preview.status === 200,
    `status ${preview.status}`,
  );
}

await post("/__role", { roleKey: "super_admin", permissions: [] });

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
