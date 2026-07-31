// Covers the customer-facing flow: browsing, the product page, the cart,
// checkout and order pages.
//
// Server Actions cannot be replayed over HTTP (their ids are build hashes and
// bound arguments are encoded into the form), so the mutations are driven
// through the mock's REST API and this asserts on what the pages then render.
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

const get = (p, opts = {}) =>
  fetch(APP + p, { headers: { cookie }, redirect: "manual", ...opts });
const body = async (p) => (await get(p)).text();
const anon = (p) => fetch(APP + p, { redirect: "manual" });

// --- seed -----------------------------------------------------------------
const cat = await post("/categories", { name: "أحبار" }, at);
const otherCat = await post("/categories", { name: "ورق" }, at);
const brand = await post("/brands", { name: "Roland" }, at);
const colour = await post(
  "/attributes",
  { key: "color", name: "اللون", type: "COLOR_SELECT" },
  at,
);
await post(`/attributes/${colour.id}/options`, { value: "red", label: "أحمر" }, at);
await post(`/attributes/${colour.id}/options`, { value: "blue", label: "أزرق" }, at);
await post(
  "/category-attributes",
  { categoryId: cat.id, attributeId: colour.id, createsVariant: true },
  at,
);

const ink = await post(
  "/products",
  {
    categoryId: cat.id,
    brandId: brand.id,
    name: "حبر إيكو",
    description: "حبر صديق للبيئة",
    type: "VARIABLE",
    sellingUnit: "PIECE",
    minOrderQuantity: 2,
  },
  at,
);
const red = await post(
  `/products/${ink.id}/variants`,
  { sku: "ECO-RED", attributeValues: [{ attributeId: colour.id, value: "red" }] },
  at,
);
const blue = await post(
  `/products/${ink.id}/variants`,
  { sku: "ECO-BLUE", attributeValues: [{ attributeId: colour.id, value: "blue" }] },
  at,
);
await post(`/variants/${red.id}/prices`, { priceListKey: "retail", amount: 25 }, at);
await post(`/variants/${blue.id}/prices`, { priceListKey: "retail", amount: 30 }, at);
await post("/inventory/receive", { variantId: red.id, quantity: 100 }, at);
await post("/inventory/receive", { variantId: blue.id, quantity: 100 }, at);

// A second, unpriced product in another category.
const paper = await post(
  "/products",
  {
    categoryId: otherCat.id,
    name: "ورق A4",
    type: "SIMPLE",
    sellingUnit: "SHEET",
    minOrderQuantity: 100,
    sku: "A4-100",
  },
  at,
);

const publish = (id) =>
  call("PATCH", `/products/${id}`, { status: "PUBLISHED" }, at);
await publish(ink.id);
await publish(paper.id);

// --- browsing --------------------------------------------------------------
{
  const list = await body("/ar/shop");
  check("shop lists published products", list.includes("حبر إيكو") && list.includes("ورق A4"));
  check("priced product shows its price", list.includes("25"));
  check(
    "unpriced product is marked unavailable",
    list.includes("غير متوفر"),
    "ورق A4 has no price",
  );
  check("filter form is present", list.includes('name="q"') && list.includes('name="minPrice"'));

  const searched = await body("/ar/shop?q=" + encodeURIComponent("حبر"));
  check(
    "search narrows the listing",
    searched.includes("حبر إيكو") && !searched.includes(">ورق A4<"),
  );

  const byCategory = await body(`/ar/shop?categoryId=${otherCat.id}`);
  check(
    "category filter narrows the listing",
    !byCategory.includes(">حبر إيكو<"),
    "ink should be excluded",
  );

  const anonList = await anon("/ar/shop");
  check("shop is public", anonList.status === 200, `status ${anonList.status}`);
}

// --- attribute filters -----------------------------------------------------
{
  const noCategory = await body("/ar/shop");
  check(
    "attribute filters stay hidden until a category is chosen",
    !noCategory.includes('name="attr_color"') &&
      noCategory.includes("اختر صنف عشان تظهر فلاتر"),
  );

  const withCategory = await body(`/ar/shop?categoryId=${cat.id}`);
  const select = withCategory.match(/<select[^>]*name="attr_color"[\s\S]*?<\/select>/)?.[0] ?? "";
  check(
    "choosing a category reveals its filterable attributes",
    select.includes('value="red"') && select.includes('value="blue"'),
    select.match(/<option[^>]*>/g)?.join(" "),
  );
  check(
    "the option's value is submitted, not its label",
    select.includes('value="red"') && select.includes(">أحمر<"),
  );

  // The ink product has a red variant; the paper product is in another category.
  const red1 = await body(`/ar/shop?categoryId=${cat.id}&attr_color=red`);
  check("filtering by an attribute value matches", red1.includes("حبر إيكو"));

  const green = await body(`/ar/shop?categoryId=${cat.id}&attr_color=green`);
  check(
    "an unmatched attribute value returns nothing",
    !green.includes(">حبر إيكو<") && green.includes("ما في نتائج"),
  );

  const selected = await body(`/ar/shop?categoryId=${cat.id}&attr_color=blue`);
  const selectedField =
    selected.match(/<select[^>]*name="attr_color"[\s\S]*?<\/select>/)?.[0] ?? "";
  check(
    "the active filter stays selected in the form",
    /value="blue"[^>]*selected/.test(selectedField),
    selectedField.match(/<option[^>]*>/g)?.join(" "),
  );

  const otherCategory = await body(`/ar/shop?categoryId=${otherCat.id}`);
  check(
    "a category with no filterable attributes says so",
    otherCategory.includes("ما في صفات قابلة للفلترة"),
  );
}

// --- product page ----------------------------------------------------------
{
  const page = await body(`/ar/shop/${ink.slug}`);
  check("product page renders name and description", page.includes("حبر صديق للبيئة"));
  check("both active variants are offered", page.includes("ECO-RED") && page.includes("ECO-BLUE"));
  check("price range is shown", page.includes("25") && page.includes("30"));

  const qty = page.match(/<input[^>]*name="quantity"[^>]*>/)?.[0] ?? "";
  check(
    "quantity respects the product's minimum order",
    qty.includes('min="2"') && qty.includes('value="2"'),
    qty,
  );
  check(
    "whole-unit product forbids fractional quantities",
    qty.includes('step="1"'),
    "sellingUnit is PIECE",
  );

  const anonPage = await anon(`/ar/shop/${ink.slug}`).then((r) => r.text());
  check(
    "anonymous visitors get a login prompt instead of add-to-cart",
    !anonPage.includes('name="quantity"') && anonPage.includes(`/login?next=`),
  );

  // Disabling a variant should take it off the page.
  await call("PATCH", `/products/${ink.id}/variants/${blue.id}/status`, { status: "DISABLED" }, at);
  const afterDisable = await body(`/ar/shop/${ink.slug}`);
  check(
    "disabled variants are not sellable",
    afterDisable.includes("ECO-RED") && !afterDisable.includes("ECO-BLUE"),
  );
  await call("PATCH", `/products/${ink.id}/variants/${blue.id}/status`, { status: "ACTIVE" }, at);

  const draft = await post(
    "/products",
    {
      categoryId: otherCat.id,
      name: "مسودة",
      type: "SIMPLE",
      sellingUnit: "PIECE",
      minOrderQuantity: 1,
      sku: "DRAFT-1",
    },
    at,
  );
  const draftPage = await get(`/ar/shop/${draft.slug}`);
  check("an unpublished product 404s", draftPage.status === 404, `status ${draftPage.status}`);
}

// --- cart ------------------------------------------------------------------
{
  const guard = await anon("/ar/cart");
  check(
    "the cart requires a session",
    guard.status === 307 && (guard.headers.get("location") ?? "").includes("/ar/login"),
    `${guard.status} -> ${guard.headers.get("location")}`,
  );

  const empty = await body("/ar/cart");
  check("empty cart says so", empty.includes("سلتك فاضية"));

  await post("/cart/items", { variantId: red.id, quantity: 4 }, at);
  const filled = await body("/ar/cart");
  check("cart lists the added line", filled.includes("ECO-RED"));
  check("cart shows the total", filled.includes("100"), "4 × 25");
  check("cart links to checkout", filled.includes(`/ar/checkout`));

  // A line with no retail price makes the total unknowable.
  const paperVariant = (await fetch(`${API}/__db`).then((r) => r.json())).variants.find(
    (v) => v.sku === "A4-100",
  );
  await post("/cart/items", { variantId: paperVariant.id, quantity: 100 }, at);
  const unpriced = await body("/ar/cart");
  check(
    "an unpriced line blocks checkout",
    unpriced.includes("ما بنقدر نحسب الإجمالي") &&
      !unpriced.includes('href="/ar/checkout"'),
  );

  const checkoutBlocked = await body("/ar/checkout");
  check(
    "checkout refuses an unpriceable cart",
    checkoutBlocked.includes("ما بنقدر نحسب الإجمالي") &&
      !checkoutBlocked.includes('name="city"'),
  );

  await call("DELETE", `/cart/items/${(await fetch(`${API}/__db`).then((r) => r.json())).cart.items.find((i) => i.variantId === paperVariant.id).id}`, undefined, at);
}

// --- checkout --------------------------------------------------------------
{
  const page = await body("/ar/checkout");
  check(
    "checkout shows the address form and total",
    page.includes('name="city"') && page.includes('name="street"') && page.includes("100"),
  );

  await call("DELETE", "/cart", undefined, at);
  const emptied = await get("/ar/checkout");
  check(
    "checkout redirects when the cart is empty",
    emptied.status === 307 && (emptied.headers.get("location") ?? "").includes("/ar/cart"),
    `${emptied.status} -> ${emptied.headers.get("location")}`,
  );
}

// --- orders ----------------------------------------------------------------
{
  const none = await body("/ar/orders");
  check("empty order history says so", none.includes("ما عندك طلبات بعد"));

  await post("/cart/items", { variantId: red.id, quantity: 4 }, at);
  const order = await post(
    "/orders",
    { shippingAddress: { city: "عمّان", street: "شارع المدينة" } },
    at,
  );
  check("order creation reserves stock", Boolean(order.id), JSON.stringify(order).slice(0, 120));

  const list = await body("/ar/orders");
  check("order appears in history", list.includes(order.id.slice(0, 8)));

  const detail = await body(`/ar/orders/${order.id}`);
  check("order detail shows the line items", detail.includes("ECO-RED"));
  check("order detail shows the shipping address", detail.includes("عمّان"));
  check("awaiting payment offers the pay button", detail.includes('name="simulateFailure"'));
  const detailButtons = detail.match(/<button[^>]*>[^<]*</g)?.join("\n") ?? "";
  check("a cancellable order offers cancelling", detailButtons.includes("إلغاء الطلب"));

  // Overselling guard.
  await post("/cart/items", { variantId: red.id, quantity: 1000 }, at);
  const rejected = await post(
    "/orders",
    { shippingAddress: { city: "عمّان", street: "شارع المدينة" } },
    at,
  );
  check(
    "the backend refuses to oversell",
    rejected.statusCode === 409 && String(rejected.message).includes("insufficient stock"),
    JSON.stringify(rejected),
  );
  await call("DELETE", "/cart", undefined, at);

  await call("PATCH", `/orders/${order.id}/status`, { status: "DELIVERED" }, at);
  const delivered = await body(`/ar/orders/${order.id}`);
  // Match rendered buttons: the RSC payload carries the whole dictionary, so a
  // bare substring search finds every label whether or not it was rendered.
  const deliveredButtons = delivered.match(/<button[^>]*>[^<]*</g)?.join("\n") ?? "";
  check(
    "a delivered order cannot be cancelled",
    !deliveredButtons.includes("إلغاء الطلب"),
    deliveredButtons.match(/>[^<]+</g)?.join(" | "),
  );
  check("a delivered order hides the pay button", !delivered.includes('name="simulateFailure"'));

  const missing = await get(`/ar/orders/${crypto.randomUUID()}`);
  check("an unknown order 404s", missing.status === 404, `status ${missing.status}`);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
