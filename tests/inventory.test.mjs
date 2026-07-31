// Exercises the inventory and warehouse admin screens.
const APP = process.env.APP_URL ?? "http://localhost:3102";
const API = "http://localhost:3100";

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const post = (p, b, t) =>
  fetch(API + p, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(t ? { authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify(b),
  }).then((r) => r.json());

await fetch(`${API}/__reset`, { method: "POST" });
await post("/__role", { roleKey: "super_admin", permissions: [] });

const tokens = await post("/auth/login", {
  email: "admin@printing-store.local",
  password: "ChangeMe123!",
});
const at = tokens.accessToken;
const cookie = `ps_at=${tokens.accessToken}; ps_rt=${tokens.refreshToken}`;
const get = (p) => fetch(APP + p, { headers: { cookie }, redirect: "manual" });
const body = async (p) => (await get(p)).text();

// --- seed -----------------------------------------------------------------
const cat = await post("/categories", { name: "ورق" }, at);
const product = await post(
  "/products",
  {
    categoryId: cat.id,
    name: "ورق A4",
    type: "SIMPLE",
    sellingUnit: "SHEET",
    minOrderQuantity: 100,
    sku: "A4-100",
  },
  at,
);
const db = await fetch(`${API}/__db`).then((r) => r.json());
const variant = db.variants.find((v) => v.productId === product.id);
const invPath = `/ar/admin/products/${product.id}/variants/${variant.id}`;

// --- warehouses -----------------------------------------------------------
{
  const html = await body("/ar/admin/warehouses");
  check("seeded MAIN warehouse is listed", html.includes("MAIN"));
  check("the single-warehouse caveat is shown", html.includes("أول مستودع فعّال"));
  check("create form is offered", html.includes('name="code"'));
}

// --- empty inventory ------------------------------------------------------
{
  const html = await body(invPath);
  check("variant inventory page renders", html.includes("A4-100"), invPath);
  check("empty stock is stated", html.includes("ما في رصيد مسجّل"));
  check("empty movement log is stated", html.includes("ما في حركات بعد"));
  check("receive and adjust forms are offered", html.includes('name="quantityDelta"') &&
    html.includes('name="quantity"'));
}

// --- after a receipt ------------------------------------------------------
await post("/inventory/receive", { variantId: variant.id, quantity: 500, reason: "شحنة" }, at);
{
  const html = await body(invPath);
  check("on-hand quantity is shown", html.includes("500"));
  check("warehouse is named, not shown as a raw id", html.includes("المستودع الرئيسي"));
  check(
    "the receipt appears in the movement log",
    html.includes("استلام") && html.includes("شحنة"),
  );

  const card = await body(`/ar/admin/products/${product.id}`);
  check(
    "the product page shows stock on the variant card",
    card.includes("500") && card.includes(`variants/${variant.id}`),
  );
}

// --- reserved stock -------------------------------------------------------
await post("/__reserve", { variantId: variant.id, quantity: 120 });
{
  const html = await body(invPath);
  const stats = html.match(/<dd[^>]*>\s*(\d+)\s*<\/dd>/g)?.join(" ") ?? "";
  check(
    "available is on hand minus reserved",
    stats.includes("500") && stats.includes("120") && stats.includes("380"),
    stats,
  );
}

// --- adjustment guard rails ----------------------------------------------
{
  // Dropping to 100 would fall below the 120 reserved.
  const rejected = await post(
    "/inventory/adjustments",
    { variantId: variant.id, quantityDelta: -400, reason: "جرد" },
    at,
  );
  check(
    "backend rejects an adjustment below reserved",
    rejected.statusCode === 409,
    JSON.stringify(rejected),
  );

  await post(
    "/inventory/adjustments",
    { variantId: variant.id, quantityDelta: -50, reason: "تلف بالتخزين" },
    at,
  );
  const html = await body(invPath);
  check("a valid adjustment lands", html.includes("450"));
  check(
    "the adjustment is logged with its reason",
    html.includes("تسوية") && html.includes("تلف بالتخزين"),
  );
  check("negative delta is shown as negative", html.includes("-50"));
}

// --- permissions ----------------------------------------------------------
// This screen names stock by SKU, so it needs `products.read` alongside
// `inventory.read` — the product and variant it reads sit behind that.
await post("/__role", { roleKey: "inventory_manager", permissions: ["inventory.read"] });
{
  const denied = await body(invPath);
  check(
    "inventory.read without products.read is refused up front",
    denied.includes("ما عندك صلاحية"),
    "rather than admitting the role and failing on the first product fetch",
  );
}

await post("/__role", {
  roleKey: "inventory_manager",
  permissions: ["inventory.read", "products.read"],
});
{
  const html = await body(invPath);
  check("read-only inventory role sees the levels", html.includes("450"));
  check(
    "read-only inventory role gets no mutation forms",
    !html.includes('name="quantityDelta"'),
  );
  const warehouses = await body("/ar/admin/warehouses");
  check("warehouses need warehouses.manage", warehouses.includes("ما عندك صلاحية"));
}

await post("/__role", { roleKey: "catalog_manager", permissions: ["products.read"] });
{
  const html = await body(invPath);
  check("inventory needs inventory.read", html.includes("ما عندك صلاحية"));
  const card = await body(`/ar/admin/products/${product.id}`);
  check(
    "the product page omits stock without inventory.read",
    !card.includes(`variants/${variant.id}`),
  );
}

await post("/__role", { roleKey: "super_admin", permissions: [] });
{
  const missing = await get(
    `/ar/admin/products/${product.id}/variants/${crypto.randomUUID()}`,
  );
  check("a missing variant 404s", missing.status === 404, `status ${missing.status}`);

  const en = await body(
    `/en/admin/products/${product.id}/variants/${variant.id}`,
  );
  check("English locale renders English labels", en.includes("On hand") &&
    en.includes("Movement log"));
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
